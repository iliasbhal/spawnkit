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
    this.redlock = new Redlock([redis]);

    process.on("exit", () => {
      this.releaseAll();
    });
  }

  lockById = new Map<string, RedlockLock>();

  private releaseAll() {
    Array.from(this.lockById.keys()).forEach((lockId) => {
      this.release(lockId);
    });
  }

  async acquire(lockId: string, duration: number): Promise<boolean> {
    try {
      const lock = await this.redlock.acquire([lockId], duration);
      this.lockById.set(lockId, lock);
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

  async extend(lockId: string, duration: number): Promise<boolean> {
    const lock = this.lockById.get(lockId);
    if (!lock) return false;

    try {
      const newLock = await this.redlock.extend(lock, duration);
      this.lockById.set(lockId, newLock);
      return true;
    } catch (err) {
      this.lockById.delete(lockId);
      return false;
    }
  }

  async release(lockId: string): Promise<boolean> {
    const lock = this.lockById.get(lockId);
    if (!lock) return false;

    try {
      await this.redlock.release(lock);
      return true;
    } catch (err) {
      return false;
    } finally {
      this.lockById.delete(lockId);
    }
  }
}

export class Snapshot
  extends RedisAdapter
  implements Adapters.AdapaterSnapshot
{
  private getKey(instanceId: number) {
    return `snapshot:${instanceId}`;
  }

  async get<Data>(instanceId: number): Promise<Data | null> {
    const key = this.getKey(instanceId);
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  async set<Data>(instanceId: number, snapshot: Data): Promise<true> {
    const key = this.getKey(instanceId);
    const serialized = JSON.stringify(snapshot);
    await this.redis.set(key, serialized);
    return true;
  }

  subscribe<Data>(
    instanceId: number,
    callback: (snapshot: Data) => void,
  ): { unsubscribe: Function } {
    let active = true;
    let prevSnapshot: any = null;
    const intervalId = setInterval(async () => {
      const snapshot = await this.get<Data>(instanceId);

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

export class PubSub extends RedisAdapter implements Adapters.AdapterPubSub {
  private getKey(channel: string) {
    return `events-bus:${channel}`;
  }

  async emit(channel: string, event: any): Promise<true> {
    const streamId = this.getKey(channel);
    const key = "event";
    const value = JSON.stringify(event);

    await this.redis.xadd(streamId, "*", key, value);
    return true;
  }

  on(channel: string, callback: (data: any) => any): { unsubscribe: Function } {
    const streamId = this.getKey(channel);
    let active = true;
    const seenTimestampIds = new Set();

    let prevTimetampKey = Date.now();

    Promise.resolve().then(async () => {
      while (active) {
        const before = Date.now() - 100;
        const elements = await this.redis.xread(
          "STREAMS",
          streamId,
          prevTimetampKey,
        );

        prevTimetampKey = before;

        const notify = (data: any) => {
          if (active) callback(data);
        };

        if (elements) {
          elements.forEach(([streamId, eventsByTimestampKey]) => {
            eventsByTimestampKey.forEach(([timestampKey, events]) => {
              if (seenTimestampIds.has(timestampKey)) return;
              seenTimestampIds.add(timestampKey);

              // eventKey should be "event" as per .emit method;
              // But we don't need it
              const eventKey = events[0];
              const rawEventData = events[1];
              if (rawEventData) {
                const eventData = JSON.parse(rawEventData);
                notify(eventData);
              }
            });
          });
        }

        await wait(25);
      }
    });

    return {
      unsubscribe: () => {
        active = false;
      },
    };
  }
}

export class MessageBroker
  extends RedisAdapter
  implements Adapters.AdapaterMessageBroker
{
  private getKey(instanceId: number) {
    return `events:${instanceId}`;
  }

  async publish<EventData>(id: number, event: EventData) {
    const hashID = this.getKey(id);
    const eventId = await this.redis.incr(hashID + ":uid");
    await this.redis.hset(hashID, eventId.toString(), JSON.stringify(event));
    return eventId;
  }

  async ack(id: number, eventId: number): Promise<true> {
    const hashID = this.getKey(id);
    await this.redis.hdel(hashID, eventId.toString());
    return true;
  }

  async has(id: number): Promise<boolean> {
    const hashID = this.getKey(id);
    const size = await this.redis.hlen(hashID);
    const hasUnprocessedEvents = size > 0;
    return hasUnprocessedEvents;
  }

  subscribe<E extends { id: number; data: any }>(
    instanceId: number,
    callback: (event: E) => void,
  ): { unsubscribe: Function } {
    let active = true;
    const seenEventIds = new Set();

    const intervalId = setInterval(async () => {
      const hash = this.getKey(instanceId);
      const events = await this.redis.hgetall(hash);
      const notify = (data: any) => {
        if (active) {
          callback(data);
        }
      };

      for (const [eventId, eventData] of Object.entries(events)) {
        if (!active) return;
        if (seenEventIds.has(eventId)) continue;

        notify({ id: eventId, data: JSON.parse(eventData) });
        seenEventIds.add(eventId);
      }
    }, 100);

    return {
      unsubscribe: () => {
        active = false;
        clearInterval(intervalId);
      },
    };
  }
}

type ScheduleQueue = BullMQ.Queue<
  Adapters.ScheduleInstanceData | Adapters.ScheduleEventData,
  any,
  "event" | "instance"
>;

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

  async list(): Promise<string[]> {
    throw new Error("TODO: IMPLEMENT A WAY TO LIST SCHEDULED ACTIONS");
    return [];
  }

  async cancel(scheduleId: string): Promise<boolean> {
    const [repeatableRemoved, delayJobStatus] = await Promise.all([
      this.queue.removeRepeatableByKey(scheduleId),
      this.queue.remove(scheduleId),
    ]);

    const isRemoved = repeatableRemoved || delayJobStatus == 1;
    return isRemoved;
  }

  async event(data: Adapters.ScheduleEventData): Promise<string> {
    if ("delay" in data.schedule) {
      const job = await this.queue.add("event", data, {
        delay: data.schedule.delay,
      });

      const jobId = job.id;
      if (!jobId) {
        throw new Error("Why no job id???");
      }

      return jobId;
    }

    if ("cron" in data.schedule) {
      const {
        instance: { kind, id },
        event: { action },
      } = data;

      const job = await this.queue.add("event", data, {
        jobId: `cronjob:${kind}:${id}:${action}:${crypto.randomUUID()}`,
        repeat: {
          pattern: data.schedule.cron,
        },
      });

      const jobId = job.repeatJobKey;
      if (!jobId) {
        throw new Error("Why no job id???");
      }

      return jobId;
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
}

type JobData = Parameters<ScheduleQueue["add"]>[1];
type JobName = Parameters<ScheduleQueue["add"]>[0];
export class Worker extends RedisAdapter implements Adapters.AdapaterWorker {
  private config: { concurrency?: number };

  constructor(redis: Redis, config?: { concurrency?: number }) {
    super(redis);
    this.config = {
      concurrency: config?.concurrency || 10,
    };
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
        concurrency: this.config.concurrency,
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
