import { Redis } from "ioredis";
import * as BullMQ from "bullmq";
import Redlock, { Lock as RedlockLock } from "redlock";
import * as Adapters from "../index";
import wait from "wait";

class RedisAdapter {
  redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }
}

export class Lock extends RedisAdapter implements Adapters.AdapterLock {
  redlock: Redlock;
  constructor(client: Redis) {
    super(client);
    this.redlock = new Redlock([client], {
      retryCount: 0,
    });
  }

  lockByOwnerKey = new Map<string, RedlockLock>();

  private createOwnerKey(lockId: string, ownerId: string) {
    return `lockId:${lockId}:ownerId:${ownerId}`;
  }

  withPrefix(resource: string) {
    return `spawnkit:locks:${resource}`;
  }

  async acquire(
    resource: string,
    ownerId: string,
    duration: number,
  ): Promise<boolean> {
    try {
      const key = this.withPrefix(resource);
      const lock = await this.redlock.acquire([key], duration);
      const ownerKey = this.createOwnerKey(resource, ownerId);
      this.lockByOwnerKey.set(ownerKey, lock);
      return true;
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("unable to achieve a quorum ")) {
          return false;
        }
      }

      throw err;
    }
  }

  async extend(
    resource: string,
    ownerId: string,
    duration: number,
  ): Promise<boolean> {
    const ownerKey = this.createOwnerKey(resource, ownerId);
    const lock = this.lockByOwnerKey.get(ownerKey);
    if (!lock) return false;

    try {
      const newLock = await this.redlock.extend(lock, duration);
      this.lockByOwnerKey.set(ownerKey, newLock);
      return true;
    } catch (err) {
      this.lockByOwnerKey.delete(ownerKey);
      return false;
    }
  }

  async release(resource: string, ownerId: string): Promise<boolean> {
    const ownerKey = this.createOwnerKey(resource, ownerId);
    const lock = this.lockByOwnerKey.get(ownerKey);
    if (!lock) return false;

    try {
      await this.redlock.release(lock);
      return true;
    } catch (err) {
      return false;
    } finally {
      this.lockByOwnerKey.delete(ownerKey);
    }
  }
}

/**
 * This class is used for internaltools
 * Using the data in stored with it, we'll be able to build tools
 * to debug and trace back what happens
 * TODO: also output files ( easier to debug with );
 */
export class Logger extends RedisAdapter implements Adapters.AdapterLogger {
  async log(
    kind: Adapters.InstanceKind,
    id: Adapters.InstanceId,
    groupId: string,
    signal: Adapters.InstanceSignal,
  ) {
    const now = Date.now();
    const serialized = JSON.stringify({
      ...signal,
      timestamp: now,
    });

    await Promise.all([
      this.redis.zadd(`spawnkit:logs:${kind}:${id}:index`, now, groupId),
      this.redis.lpush(
        `spawnkit:logs:${kind}:${id}:logs:${groupId}`,
        serialized,
      ),
    ]);
  }

  /** list log groups for this instance */
  async list(
    kind: Adapters.InstanceKind,
    id: Adapters.InstanceId,
    range: { from: number; to: number } = {
      from: 0,
      to: -1 /* -1 = until the last element */,
    },
  ): Promise<string[]> {
    return await this.redis.zrange(
      `spawnkit:logs:${kind}:${id}:index`,
      range.from,
      range.to,
      "REV",
    );
  }

  /* retieve all the logs from a log group */
  async get(
    kind: Adapters.InstanceKind,
    id: Adapters.InstanceId,
    groupId: string,
  ): Promise<Adapters.InstanceSignal[]> {
    const rawLogs = await this.redis.lrange(
      `spawnkit:logs:${kind}:${id}:logs:${groupId}`,
      0,
      -1,
    );
    const logs = rawLogs.map((raw) => JSON.parse(raw));
    return logs;
  }

  async delete(
    kind: string,
    id: string,
    range: { from: number; to: number },
  ): Promise<any> {}
}

export class Data extends RedisAdapter implements Adapters.AdapaterData {
  private withPrevix(string: Adapters.InstanceId) {
    return `spawnkit:data:${string}`;
  }

  async get<Data>(
    kind: Adapters.InstanceKind,
    id: Adapters.InstanceId,
    key: string,
  ): Promise<Data | null> {
    const data = await this.redis.get(`spawnkit:data:${kind}:${id}:${key}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  async set<Data>(
    kind: Adapters.InstanceKind,
    id: Adapters.InstanceId,
    key: string,
    value: Data,
  ): Promise<true> {
    const serialized = JSON.stringify(value);
    await this.redis.set(`spawnkit:data:${kind}:${id}:${key}`, serialized);
    return true;
  }
}

type MaintenanceTask = {
  name: "zttl";
  config: {
    below: number;
    key: string;
  };
};

export class MessageBroker
  extends RedisAdapter
  implements Adapters.AdapaterMessageBroker
{
  queue: ScheduleQueue;

  constructor(redis: Redis) {
    super(redis);

    this.queue = new BullMQ.Queue(Scheduler.QUEUE_NAME, {
      connection: redis,
      prefix: "spawnkit",
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
  }
  private withPrefix(channelName: string) {
    return `spawnkit:messages:${channelName}`;
  }

  async publish<EventData>(
    channel: string,
    event: EventData,
    options?: { mode: "pubsub" },
  ): Promise<Adapters.EventId> {
    const hashID = this.withPrefix(channel);
    const eventId = crypto.randomUUID();
    const zmember = JSON.stringify({
      id: eventId,
      data: event,
    });

    const now = Date.now();
    await this.redis.zadd(hashID, now, zmember);

    if (options?.mode === "pubsub") {
      // Since We don't need to prune the set for evey event
      // We just need to prune it from time to time so that it doesn't grow much
      // only schedule a task on in ten events
      const oneEvery = 1 / 20;
      const isSampled = Math.random() < oneEvery;
      if (isSampled) {
        Scheduler.addMaintenanceTask({
          redis: this.redis,
          runInNext: "EVERY_MIN",
          task: {
            name: "zttl",
            config: {
              key: hashID,
              below: now,
            },
          },
        });
      }
    }

    return eventId;
  }

  async ack<EventData>(
    channel: string,
    event: { id: Adapters.EventId; data: EventData },
  ): Promise<true> {
    const hashID = this.withPrefix(channel);
    const zmember = JSON.stringify(event);
    await this.redis.zrem(hashID, zmember);
    return true;
  }

  async has(channel: string): Promise<boolean> {
    const hashID = this.withPrefix(channel);
    const size = await this.redis.zcard(hashID);
    const hasUnprocessedEvents = size > 0;
    return hasUnprocessedEvents;
  }

  private async getLatestMessages(
    channel: string,
    range: { from: number; to: number },
  ) {
    const hashID = this.withPrefix(channel);
    const rawEvents = await this.redis.zrangebyscore(
      hashID,
      range.from,
      range.to,
    );
    const events = rawEvents.map((rawEvent) => JSON.parse(rawEvent));
    return events;
  }

  subscribe<E>(
    channel: string,
    callback: (event: E) => any,
    options?: {
      mode: "pubsub";
    },
  ): { unsubscribe: Function } {
    const abortCtl = new AbortController();
    const abortSignal = abortCtl.signal;

    Promise.resolve().then(async () => {
      const previousEventsIds = new Set();
      const range = {
        // If pubsub, we don't care about past events
        from: options?.mode === "pubsub" ? Date.now() : 0,
        to: Infinity,
      };

      while (!abortSignal.aborted) {
        const timestampBeforeRequest = Date.now();
        const events = await this.getLatestMessages(channel, range);
        range.from = timestampBeforeRequest;

        if (events.length) {
          events.forEach((event) => {
            if (abortSignal.aborted) return;
            if (previousEventsIds.has(event.id)) return;
            callback(event as any);
          });

          previousEventsIds.clear();
          events.forEach((event) => {
            previousEventsIds.add(event.id);
          });
        }

        await wait(1);
      }
    });

    return {
      unsubscribe: () => {
        abortCtl.abort();
      },
    };
  }
}

interface MaintenanceCronConfig {
  cron: string;
  queue: `maintenance:${string}`;
  tasks: string;
}

type ScheduleQueue = BullMQ.Queue<
  | Adapters.ScheduleInstanceData
  | Adapters.ScheduleEventConfig
  | MaintenanceCronConfig,
  any,
  `event:${string}` | "instance" | `maintenance:${string}`
>;

type JobData = Parameters<ScheduleQueue["add"]>[1];
type JobName = Parameters<ScheduleQueue["add"]>[0];

export class Scheduler
  extends RedisAdapter
  implements Adapters.AdapaterScheduler
{
  static QUEUE_NAME = "queues";
  private queue: ScheduleQueue;

  constructor(redis: Redis) {
    super(redis);

    this.queue = new BullMQ.Queue(Scheduler.QUEUE_NAME, {
      connection: redis,
      prefix: "spawnkit",
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
  }

  async delete(
    kind: Adapters.InstanceKind,
    id: Adapters.InstanceId,
    scheduleId: string,
  ) {
    const redisKey = `spawnkit:scheduled:${kind}:${id}:index`;
    const scheduleRedisKey = `spawnkit:scheduled:${kind}:${id}:status:${scheduleId}`;
    const [repeatableRemoved, delayJobStatus] = await Promise.all([
      this.queue.removeRepeatableByKey(scheduleId),
      this.queue.remove(scheduleId),
      this.redis.hdel(redisKey, scheduleId),
      this.redis.del(scheduleRedisKey),
    ]);

    const isCanceled = repeatableRemoved || delayJobStatus == 1;
    return isCanceled;
  }

  async cancel(
    kind: Adapters.InstanceKind,
    id: Adapters.InstanceId,
    scheduleId: string,
  ): Promise<boolean> {
    const redisKey = `spawnkit:scheduled:${kind}:${id}:index`;
    const rawScheduleMetadata = await this.redis.hget(redisKey, scheduleId);
    if (!rawScheduleMetadata) {
      return false;
    }

    const scheduleMetadata: Adapters.ScheduleEventMetadata =
      JSON.parse(rawScheduleMetadata);
    scheduleMetadata.canceled = true;

    const [repeatableRemoved, delayJobStatus] = await Promise.all([
      this.queue.removeRepeatableByKey(scheduleId),
      this.queue.remove(scheduleId),
      this.redis.hset(redisKey, scheduleId, JSON.stringify(scheduleMetadata)),
    ]);

    const isCanceled = repeatableRemoved || delayJobStatus == 1;
    return isCanceled;
  }

  async list(
    kind: Adapters.InstanceKind,
    id: Adapters.InstanceId,
  ): Promise<Adapters.ScheduleEventMetadata[]> {
    const redisKey = `spawnkit:scheduled:${kind}:${id}:index`;
    const rawScheduledEvents = await this.redis.hvals(redisKey);

    const scheduledEvents = rawScheduledEvents.map((st) => JSON.parse(st));
    return scheduledEvents as Adapters.ScheduleEventMetadata[];
  }

  async store<Data>(
    kind: string,
    id: string,
    scheduleId: string,
    data: Data,
  ): Promise<true> {
    const redisKey = `spawnkit:scheduled:${kind}:${id}:status:${scheduleId}`;
    await this.redis.lpush(redisKey, JSON.stringify(data));
    return true;
  }

  async get<Data>(
    kind: string,
    id: string,
    scheduleId: string,
    last?: number,
  ): Promise<Data[]> {
    const redisKey = `spawnkit:scheduled:${kind}:${id}:status:${scheduleId}`;

    const fromIncluded = 0;
    const toIncluded = !last ? -1 : last; // -1 = LAST
    const members = await this.redis.lrange(redisKey, fromIncluded, toIncluded);
    return members.map((m) => JSON.parse(m));
  }

  private async register(
    scheduleId: Adapters.ScheduleId,
    config: Adapters.ScheduleEventConfig,
  ) {
    const metaData: Adapters.ScheduleEventMetadata = {
      config,
      scheduleId: scheduleId,
      created_at: Date.now(),
      canceled: false,
    };
    const { kind, id } = config.instance;
    const redisKey = `spawnkit:scheduled:${kind}:${id}:index`;
    await this.redis.hset(redisKey, scheduleId!, JSON.stringify(metaData));
  }

  async event(config: Adapters.ScheduleEventConfig): Promise<string> {
    const bullJobConfig =
      "delay" in config.schedule
        ? {
            delay: config.schedule.delay,
          }
        : "cron" in config.schedule
          ? {
              repeat: {
                pattern: config.schedule.cron,
              },
            }
          : null;

    if (!bullJobConfig) {
      throw new Error("Schedule type not implemented");
    }

    const jobName =
      `event:${config.instance.kind}:${config.instance.id}:${crypto.randomUUID()}` as const;
    const job = await this.queue.add(jobName, config, bullJobConfig);
    const scheduleId = this.getScheduleID(job);
    if (!scheduleId) {
      throw new Error("Uh Oh!");
    }

    await this.register(scheduleId, config);
    return scheduleId;
  }

  async instance(data: Adapters.ScheduleInstanceData): Promise<string> {
    // `bullmq` will discard job with same ids
    // We leverage this behaviour to ensure we don't schedule
    // actors instance if they  that are already in the pipeline
    const periodId = (Date.now() / 1000).toFixed(0);
    const job = {
      id: `${data.kind}:${data.id}:${periodId}`,
      data: {
        kind: data.kind,
        id: data.id,
      },
    };

    await this.queue.add("instance", job.data, {
      jobId: job.id,
    });

    return job.id;
  }

  getScheduleID(job: BullMQ.Job) {
    const scheduleId = job.repeatJobKey || job.id;
    return scheduleId!;
  }

  // BullMQ almost guarantee "exactly once" job execution
  // but it can happen to go execute "at least once"
  // This is why we need to make sure the event is not processed twice
  // As for instance, we don't care if they are instantiate twice'
  async canProcessJob(job: BullMQ.Job<JobData, any, JobName>) {
    const isScheduledJob = job.name.startsWith("event");
    if (isScheduledJob) {
      const jobData = job.data as Adapters.ScheduleByType["event"];
      const kind = jobData.instance.kind;
      const instanceId = jobData.instance.id;
      const jobKey = `spawnkit:locks:${kind}:${instanceId}:jobs:${job.id}`;
      const executCount = await this.redis.incr(jobKey);
      const hasAlreadyBeenExecuted = executCount > 1;
      if (hasAlreadyBeenExecuted) {
        return false;
      }
    }

    return true;
  }

  static SCHEDULED_TASKS_CRON = {
    EVERY_MIN: {
      cron: `* * * * *`,
      queue: `maintenance:every-minute`,
      tasks: `spawnkit:tasks:maintenance:every-minute`,
    },
  } satisfies Record<string, MaintenanceCronConfig>;

  async ensureMainenanceTasksSetup() {
    Object.values(Scheduler.SCHEDULED_TASKS_CRON).forEach((config) => {
      this.queue.add(config.queue, config, {
        repeat: {
          immediately: false,
          pattern: config.cron,
        },
      });
    });
  }

  static async addMaintenanceTask(config: {
    redis: Redis;
    runInNext: keyof typeof Scheduler.SCHEDULED_TASKS_CRON;
    task: MaintenanceTask;
  }) {
    const cron = Scheduler.SCHEDULED_TASKS_CRON[config.runInNext];
    await config.redis.rpush(cron.tasks, JSON.stringify(config.task));
  }

  async handleMaintenance(cronConfig: MaintenanceCronConfig) {
    while (true) {
      const rawTask = await this.redis.lpop(cronConfig.tasks);
      if (!rawTask) break;

      console.log("RAW TASK", rawTask);
      const task = JSON.parse(rawTask) as MaintenanceTask;
      if (task.name === "zttl") {
        await this.redis.zremrangebyscore(
          task.config.key,
          0,
          task.config.below,
        );
      }
    }
  }

  subscribe(
    callback: <Type extends keyof Adapters.ScheduleByType>(
      type: Type,
      data: Adapters.ScheduleByType[Type],
      context: Adapters.ScheduleContext,
    ) => any,
  ): { unsubscribe: Function } {
    this.ensureMainenanceTasksSetup();

    const worker = new BullMQ.Worker<JobData, any, JobName>(
      Scheduler.QUEUE_NAME,
      async (job) => {
        const canProcess = this.canProcessJob(job);
        if (!canProcess) return;

        if (job.name.startsWith("event")) {
          const scheduleId = this.getScheduleID(job);
          await callback("event", job.data as any, { scheduleId });
        }

        if (job.name == "instance") {
          await callback("instance", job.data as any, {});
        }

        if (job.name.startsWith("maintenance")) {
          await this.handleMaintenance(job.data as MaintenanceCronConfig);
        }
      },
      {
        autorun: false,
        // concurrency: this.config.concurrency,
        connection: this.redis,
        prefix: "spawnkit",
      },
    );

    worker.run();
    return {
      unsubscribe() {
        return worker.close();
      },
    };
  }
}
