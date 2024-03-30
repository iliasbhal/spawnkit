import { Redis } from "ioredis";
import * as BullMQ from "bullmq";
import Redlock, { Lock as RedlockLock } from "redlock";
import * as Adapters from "./index";

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
  }

  lockById = new Map<string, RedlockLock>();

  async acquire(lockId: string, duration: number): Promise<boolean> {
    const lock = await this.redlock.acquire([lockId], duration);
    this.lockById.set(lockId, lock);
    return true;
  }

  async extend(lockId: string, duration: number): Promise<boolean> {
    const lock = this.lockById.get(lockId);
    if (!lock) return false;

    const newLock = await this.redlock.extend(lock, duration);
    this.lockById.set(lockId, newLock);
    return true;
  }

  async release(lockId: string): Promise<boolean> {
    const lock = this.lockById.get(lockId);
    if (!lock) return false;

    await this.redlock.release(lock);
    this.lockById.delete(lockId);
    return true;
  }
}

export class Snapshot
  extends RedisAdapter
  implements Adapters.AdapaterSnapshot
{
  private getKey(actorId: number) {
    return `snapshot:${actorId}`;
  }

  async get<Data>(actorId: number): Promise<Data | null> {
    const key = this.getKey(actorId);
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  async set<Data>(actorId: number, snapshot: Data): Promise<true> {
    const key = this.getKey(actorId);
    const serialized = JSON.stringify(snapshot);
    await this.redis.set(key, serialized);
    return true;
  }

  subscribe<Data>(
    actorId: number,
    callback: (snapshot: Data) => void,
  ): { unsubscribe: Function } {
    let active = true;
    let prevSnapshot: any = null;
    const intervalId = setInterval(async () => {
      const snapshot = await this.get<Data>(actorId);

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

export class EventBus extends RedisAdapter implements Adapters.AdapterEventBus {
  private getKey(channel: string) {
    return `events-bus:${channel}`;
  }

  async emit(channel: string, event: any): Promise<true> {
    const streamId = this.getKey(channel);

    const key = "event";
    const value = JSON.stringify(event);

    const emited = await this.redis.xadd(streamId, "*", key, value);
    // console.log("emited", emited);
    return true;
  }

  on(channel: string, callback: (data: any) => any): { unsubscribe: Function } {
    // console.log("await wait(1000);");
    const streamId = this.getKey(channel);
    let active = true;
    const seenTimestampIds = new Set();
    let prevTimetampKey = Date.now();

    const intervalId = setInterval(async () => {
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

      if (!elements) return;

      // console.log(JSON.stringify(elements, null, 2));

      elements.forEach(([streamId, eventsByTimestampKey]) => {
        eventsByTimestampKey.forEach(([timestampKey, events]) => {
          if (seenTimestampIds.has(timestampKey)) return;
          seenTimestampIds.add(timestampKey);

          const eventKey = events[0]; // should be "event" as per .emit method;
          const rawEventData = events[1];
          if (rawEventData) {
            const eventData = JSON.parse(rawEventData);
            notify(eventData);
          }
        });
      });
    }, 10);

    return {
      unsubscribe: () => {
        active = false;
        clearInterval(intervalId);
      },
    };
  }
}

export class Event extends RedisAdapter implements Adapters.AdapaterEvents {
  private getKey(actorId: number) {
    return `events:${actorId}`;
  }

  async publish<EventData>(id: number, event: EventData) {
    const data = JSON.stringify(event);
    const hash = this.getKey(id);
    const eventId = await this.redis.incr(hash);
    await this.redis.hset(hash, eventId.toString(), data);
    return eventId;
  }

  async ack(id: number, eventId: number): Promise<true> {
    const hash = this.getKey(id);
    await this.redis.hdel(hash, eventId.toString());
    return true;
  }

  async has(id: number): Promise<boolean> {
    const hash = this.getKey(id);
    const size = await this.redis.hlen(hash);
    const hasUnprocessedEvents = size > 0;
    return hasUnprocessedEvents;
  }

  subscribe<E extends { id: number; data: any }>(
    actorId: number,
    callback: (event: E) => void,
  ): { unsubscribe: Function } {
    let active = true;
    const seenEventIds = new Set();
    const intervalId = setInterval(async () => {
      const hash = this.getKey(actorId);
      const events = await this.redis.hgetall(hash);

      const notify = (data: any) => {
        if (active) {
          callback(data);
        }
      };

      for (const [eventId, eventData] of Object.entries(events)) {
        if (!active) return;
        if (seenEventIds.has(eventId)) continue;

        notify({ id: eventId, data: eventData });
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

export class Scheduler
  extends RedisAdapter
  implements Adapters.AdapaterScheduler
{
  static QUEUE_NAME = "Spawnkit";
  private queue: BullMQ.Queue;

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

  async schedule(data: Adapters.ScheduleData): Promise<true> {
    // `bullmq` will discard job with same ids
    // We leverage this behaviour to ensure we don't schedule
    // actors instance if they  that are already in the pipeline
    const periodId = (Date.now() / 100).toFixed(0);
    const job = {
      id: `${data.kind}:${data.id}:${periodId}`,
      data: {
        kind: data.kind,
        id: data.id,
        input: data.input,
      },
    };

    await this.queue.add("event", job.data, {
      jobId: job.id,
    });

    return true;
  }
}

export class Worker extends RedisAdapter implements Adapters.AdapaterWorker {
  private config: { concurrency?: number };

  constructor(redis: Redis, config?: { concurrency?: number }) {
    super(redis);
    this.config = {
      concurrency: config?.concurrency || 10,
    };
  }

  subscribe(callback: (data: Adapters.ScheduleData) => any): {
    unsubscribe: Function;
  } {
    const worker = new BullMQ.Worker(
      Scheduler.QUEUE_NAME,
      async (job) => {
        await callback(job.data);
      },
      {
        autorun: true,
        concurrency: this.config.concurrency,
        connection: this.redis,
      },
    );

    return {
      unsubscribe() {
        return worker.close();
      },
    };
  }
}
