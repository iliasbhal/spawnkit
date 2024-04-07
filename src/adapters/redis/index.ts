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

  private getOwnerKey(lockId: string, ownerId: string) {
    return `lockId:${lockId}:ownerId:${ownerId}`;
  }

  async acquire(
    lockId: string,
    ownerId: string,
    duration: number,
  ): Promise<boolean> {
    try {
      const lock = await this.redlock.acquire([lockId], duration);
      const ownerKey = this.getOwnerKey(lockId, ownerId);
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
    const ownerKey = this.getOwnerKey(lockId, ownerId);
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
    const ownerKey = this.getOwnerKey(lockId, ownerId);
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

export class Snapshot
  extends RedisAdapter
  implements Adapters.AdapaterSnapshot
{
  private getKey(instanceId: Adapters.InstanceId) {
    return `snapshot:${instanceId}`;
  }

  async load<Data>(instanceId: Adapters.InstanceId): Promise<Data | null> {
    const key = this.getKey(instanceId);
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  async save<Data>(
    instanceId: Adapters.InstanceId,
    snapshot: Data,
  ): Promise<true> {
    const key = this.getKey(instanceId);
    const serialized = JSON.stringify(snapshot);
    await this.redis.set(key, serialized);
    return true;
  }

  subscribe<Data>(
    instanceId: Adapters.InstanceId,
    callback: (snapshot: Data) => void,
  ): { unsubscribe: Function } {
    let active = true;
    let prevSnapshot: any = null;
    const intervalId = setInterval(async () => {
      const snapshot = await this.load<Data>(instanceId);

      const notify = (data: any) => {
        if (active) {
          callback(data);
        }
      };

      const hashObj = (data: any) =>
        JSON.stringify(JSON.parse(JSON.stringify(data)));

      if (snapshot) {
        if (prevSnapshot) {
          const left = hashObj(snapshot);
          const right = hashObj(prevSnapshot);
          const hasChanged = left !== right;
          if (hasChanged) notify(snapshot);
        } else {
          notify(snapshot);
        }
      }

      prevSnapshot = snapshot;
    }, 100);

    return {
      unsubscribe: () => {
        active = false;
        clearInterval(intervalId);
      },
    };
  }
}

export class MessageBroker
  extends RedisAdapter
  implements Adapters.AdapaterMessageBroker
{
  private getKey(instanceId: Adapters.InstanceId) {
    return `events:${instanceId}`;
  }

  async publish<EventData>(
    channel: string,
    event: EventData,
  ): Promise<Adapters.EventId> {
    const hashID = this.getKey(channel);
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
    const hashID = this.getKey(channel);
    const zmember = JSON.stringify(event);
    await this.redis.zrem(hashID, zmember);
    return true;
  }

  async has(channel: string): Promise<boolean> {
    const hashID = this.getKey(channel);
    const size = await this.redis.zcard(hashID);
    const hasUnprocessedEvents = size > 0;
    return hasUnprocessedEvents;
  }

  subscribe<E>(
    channel: string,
    callback: (event: E) => any,
  ): { unsubscribe: Function } {
    const subscription = {
      active: true,
      after: 0,
    };
    const hashID = this.getKey(channel);
    const previousEventsIds = new Set();

    Promise.resolve().then(async () => {
      while (subscription.active) {
        const timestampBeforeRequest = Date.now();
        const from = subscription.after;
        const until = Infinity;
        subscription.after = timestampBeforeRequest;
        const rawEvents = await this.redis.zrangebyscore(hashID, from, until);
        const events = rawEvents.map((rawEvent) => JSON.parse(rawEvent));

        events.forEach((event) => {
          if (!subscription.active) return;
          if (previousEventsIds.has(event.id)) return;
          callback(event as any);
        });

        events.forEach((event) => {
          previousEventsIds.add(event.id);
        });

        subscription.after = timestampBeforeRequest;
        await wait(100);
      }
    });

    return {
      unsubscribe: () => {
        subscription.active = false;
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
