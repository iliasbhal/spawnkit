import { Redis } from "ioredis";
import * as BullMQ from "bullmq";
import Redlock, { Lock as RedlockLock } from "redlock";
import * as Adapters from "./index";

export class Lock implements Adapters.AdapterLock {
  redlock: Redlock;
  constructor(redis: Redis) {
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

export class Snapshot implements Adapters.AdapaterSnapshot {
  redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

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

export class Event implements Adapters.AdapaterEvents {
  redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  private getKey(actorId: number) {
    return `events:${actorId}`;
  }

  async publish<EventData>(actorId: number, event: EventData) {
    const data = JSON.stringify(event);
    const hash = this.getKey(actorId);
    const eventId = await this.redis.incr(hash);
    await this.redis.hset(hash, eventId.toString(), data);
    return eventId;
  }

  async ack(actorId: number, eventId: number): Promise<true> {
    const hash = this.getKey(actorId);
    await this.redis.hdel(hash, eventId.toString());
    return true;
  }

  async has(actorId: number): Promise<boolean> {
    const hash = this.getKey(actorId);
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

export class Scheduler implements Adapters.AdapaterScheduler {
  static QUEUE_NAME = "Spawnkit";
  private queue: BullMQ.Queue;

  constructor(redis: Redis) {
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

export class Worker implements Adapters.AdapaterWorker {
  private redis: Redis;
  private config: { concurrency?: number };

  constructor(redis: Redis, config?: { concurrency?: number }) {
    this.redis = redis;
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
