import { Redis } from "ioredis";
import * as Adapters from "../../index";
import { RedisAdapter } from "./_base";
import wait from "wait";
// import { MaintenanceQueue } from "./_common";

export class MessageBroker
  extends RedisAdapter
  implements Adapters.AdapaterMessageBroker
{
  // maintenanceQ: MaintenanceQueue;

  constructor(redis: Redis) {
    super(redis);
    // this.maintenanceQ = new MaintenanceQueue(redis);
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
    // console.log(await this.redis.zrevrange(hashID, 0, -1));

    if (options?.mode === "pubsub") {
      // Since We don't need to prune the set for evey event
      // We just need to prune it from time to time so that it doesn't grow much
      // only schedule a task on in ten events
      const oneEvery = 1 / 20;
      const isSampled = Math.random() < oneEvery;
      if (isSampled) {
        // this.maintenanceQ.schedule({
        //   runInNext: "EVERY_MIN",
        //   task: {
        //     name: "zttl",
        //     config: {
        //       key: hashID,
        //       below: now,
        //     },
        //   },
        // });
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
