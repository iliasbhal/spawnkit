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
  constructor(redis: Redis) {
    super(redis);
    this.redlock = new Redlock([redis], {
      retryCount: 0,
    });
  }

  lockByOwnerKey = new Map<string, RedlockLock>();

  private createOwnerKey(lockId: string, ownerId: string) {
    return `lockId:${lockId}:ownerId:${ownerId}`;
  }

  async acquire(
    lockId: string,
    ownerId: string,
    duration: number,
  ): Promise<boolean> {
    try {
      const lock = await this.redlock.acquire([lockId], duration);
      const ownerKey = this.createOwnerKey(lockId, ownerId);
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
    lockId: string,
    ownerId: string,
    duration: number,
  ): Promise<boolean> {
    const ownerKey = this.createOwnerKey(lockId, ownerId);
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

  async release(lockId: string, ownerId: string): Promise<boolean> {
    const ownerKey = this.createOwnerKey(lockId, ownerId);
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

export class Data extends RedisAdapter implements Adapters.AdapaterData {
  private withPrevix(string: Adapters.InstanceId) {
    return `data:${string}`;
  }

  async get<Data>(
    instanceId: Adapters.InstanceId,
    key: string,
  ): Promise<Data | null> {
    const redisKey = this.withPrevix(instanceId + ":key+" + key);
    const data = await this.redis.get(redisKey);
    if (!data) return null;
    return JSON.parse(data);
  }

  async set<Data>(
    instanceId: Adapters.InstanceId,
    key: string,
    value: Data,
  ): Promise<true> {
    const redisKey = this.withPrevix(instanceId + ":key+" + key);
    const serialized = JSON.stringify(value);
    await this.redis.set(redisKey, serialized);
    return true;
  }
}

export class MessageBroker
  extends RedisAdapter
  implements Adapters.AdapaterMessageBroker
{
  private withPrefix(channelName: string) {
    return `messages:${channelName}`;
  }

  async publish<EventData>(
    channel: string,
    event: EventData,
  ): Promise<Adapters.EventId> {
    const hashID = this.withPrefix(channel);
    const eventId = crypto.randomUUID();
    const zmember = JSON.stringify({
      id: eventId,
      data: event,
    });

    await this.redis.zadd(hashID, Date.now(), zmember);
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
  ): { unsubscribe: Function } {
    const abortCtl = new AbortController();
    const abortSignal = abortCtl.signal;

    Promise.resolve().then(async () => {
      const previousEventsIds = new Set();
      const range = {
        from: 0,
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

        await wait(100);
      }
    });

    return {
      unsubscribe: () => {
        abortCtl.abort();
      },
    };
  }
}

type ScheduleQueue = BullMQ.Queue<
  Adapters.ScheduleInstanceData | Adapters.ScheduleEventData,
  any,
  "event" | "instance"
>;

type JobData = Parameters<ScheduleQueue["add"]>[1];
type JobName = Parameters<ScheduleQueue["add"]>[0];

export class Scheduler
  extends RedisAdapter
  implements Adapters.AdapaterScheduler
{
  static QUEUE_NAME = "Spawnkit";
  private queue: ScheduleQueue;

  constructor(redis: Redis) {
    super(redis);
    this.queue = new BullMQ.Queue(Scheduler.QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
  }

  async cancel(scheduleId: string): Promise<boolean> {
    const redisKey = "Spawnkit:scheduled-events";
    const [repeatableRemoved, delayJobStatus] = await Promise.all([
      this.queue.removeRepeatableByKey(scheduleId),
      this.queue.remove(scheduleId),
      this.redis.hdel(redisKey, scheduleId),
    ]);

    const isRemoved = repeatableRemoved || delayJobStatus == 1;
    return isRemoved;
  }

  async list(): Promise<Adapters.ScheduleEventMetadata[]> {
    const redisKey = "Spawnkit:scheduled-events";
    const rawScheduledEvents = await this.redis.hvals(redisKey);

    const scheduledEvents = rawScheduledEvents.map((st) => JSON.parse(st));
    return scheduledEvents as Adapters.ScheduleEventMetadata[];
  }

  private async addToList(data: Adapters.ScheduleEventData, job: BullMQ.Job) {
    const jobID = job.repeatJobKey || job.id;
    const metaData = {
      data,
      scheduleId: jobID,
      created_at: Date.now(),
    };

    const redisKey = "Spawnkit:scheduled-events";
    await this.redis.hset(redisKey, jobID!, JSON.stringify(metaData));
  }

  async event(data: Adapters.ScheduleEventData): Promise<string> {
    if ("delay" in data.schedule) {
      const job = await this.queue.add("event", data, {
        delay: data.schedule.delay,
      });

      const scheduleId = job.id;
      if (!scheduleId) throw new Error("Why no job id???");

      await this.addToList(data, job);
      return scheduleId;
    }

    if ("cron" in data.schedule) {
      const job = await this.queue.add("event", data, {
        repeat: {
          pattern: data.schedule.cron,
        },
      });

      const scheduleId = job.repeatJobKey;
      if (!scheduleId) {
        throw new Error("Why no job id???");
      }

      await this.addToList(data, job);
      return scheduleId;
    }

    throw new Error("Schedule Kind not implemented");
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

  async canProcessJob(job: BullMQ.Job<JobData, any, JobName>) {
    const isScheduledJob = job.name === "event";
    if (isScheduledJob) {
      const jobData = job.data as Adapters.ScheduleByType["event"];
      const kind = jobData.instance.kind;
      const instanceId = jobData.instance.id;
      const jobKey = `${kind}:${instanceId}:${job.id}`;
      const executCount = await this.redis.incr(jobKey);
      const hasAlreadyBeenExecuted = executCount > 1;
      if (hasAlreadyBeenExecuted) {
        // BullMQ almost guarantee "exactly once" job execution
        // but it can happen to go execute "at least once"
        // This is why we need to make sure the event is not processed twice
        // As for instance, we don't care if they are instantiate twice'
        return false;
      }
    }

    return true;
  }

  subscribe(
    callback: <Type extends keyof Adapters.ScheduleByType>(
      type: Type,
      scheduleData: Adapters.ScheduleByType[Type],
    ) => any,
  ): { unsubscribe: Function } {
    const worker = new BullMQ.Worker<JobData, any, JobName>(
      Scheduler.QUEUE_NAME,
      async (job) => {
        const canProcess = this.canProcessJob(job);
        if (!canProcess) return;

        await callback(job.name, job.data);
      },
      {
        autorun: false,
        // concurrency: this.config.concurrency,
        connection: this.redis,
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
