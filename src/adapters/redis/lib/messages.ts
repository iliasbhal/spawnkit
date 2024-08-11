import { Client } from "@/models/Client";
import * as Adapters from "../../index";
import { RedisAdapter } from "./_base";
import { wait } from "../../../utils/wait";
import { lerp } from "../../../utils/lerp";

const { nanoid } = require("nanoid");
const superjson = require('superjson');

interface Message<DataShape> {
  id: Adapters.EventId;
  data: DataShape;
  meta: {
    client: string;
  };
}

export class MessageBroker
  extends RedisAdapter
  implements Adapters.AdapaterMessageBroker {
  link(client: Client<any>): void {
    super.link(client);
    this.initializeGlobalPubSub();
  }

  private callbackByChannel = new Map<
    string,
    Set<Parameters<typeof this.subscribe>[2]>
  >();

  getClientChannel() {
    const channel = `spawnkit:pubsub-clients:${this.client.id}`;
    return channel;
  }

  initializeGlobalPubSub() {
    const pubsub = this.clone();
    const clientChannel = this.getClientChannel();

    pubsub.subscribe(clientChannel);
    pubsub.on("message", (clientChannel, message) => {
      const parsed = superjson.parse(message) as any;

      const callbacks = this.callbackByChannel.get(parsed.channel);
      if (callbacks) {
        callbacks.forEach((callback) => {
          callback(parsed.message);
        });
      }
    });

    return {
      unsubscribe() {
        pubsub.unsubscribe();
      },
    };
  }

  private getChannel(instance: Adapters.InstanceIdentifier, channel: string) {
    return `spawnkit:messages:${instance.kind}:${instance.id}:${channel}`;
  }

  async publish<EventData>(
    instance: Adapters.InstanceIdentifier,
    channel: Adapters.MessageChannel,
    event: EventData
  ): Promise<Adapters.EventId> {
    const messageChannel = this.getChannel(instance, channel);
    const eventId = nanoid();
    const message: Message<EventData> = {
      id: eventId,
      data: event,
      meta: {
        client: this.client.id,
      },
    };

    const isRpcCall = channel.startsWith("rpc");
    if (isRpcCall) {
      await this.publishMQ(messageChannel, message);
      return eventId;
    }

    const isReply = channel.startsWith("reply:");
    if (isReply) {
      const rpcIncomingMessageId = channel.split(":").pop();
      if (!rpcIncomingMessageId) throw new Error("AAA");
      const originRpc = this.rpcOriginByMessageId.get(rpcIncomingMessageId);
      if (!originRpc) throw new Error("AAAA");
      await this.publishClientPubSub(originRpc, messageChannel, message);
      return eventId;
    }

    const isBroadcastEvent = channel.startsWith("broadcast:");
    if (isBroadcastEvent) {
      await this.publishClientBroadcast(messageChannel, message);
      return eventId;
    }

    throw new Error("Unhandled channel type");
  }

  rpcOriginByMessageId = new Map<string, string>();
  subscribe<E>(
    instance: Adapters.InstanceIdentifier,
    channel: string,
    callback: (event: E) => any,
  ): { unsubscribe: Function } {
    const messageChannel = this.getChannel(instance, channel);
    const isRpcCall = channel.startsWith("rpc");
    if (isRpcCall) {
      const subscription = this.listenMQ(messageChannel, (event) => {
        const replyToClient = event.meta.client;
        if (replyToClient) {
          this.rpcOriginByMessageId.set(event.id, event.meta.client);
        }

        return callback(event);
      });

      return {
        unsubscribe: () => {
          subscription.unsubscribe();
        },
      };
    }

    const isReply = channel.startsWith("reply:");
    if (isReply) {
      const subscription = this.listenClientPubSub(
        messageChannel,
        (event: any) => {
          return callback(event);
        },
      );

      return {
        unsubscribe: () => {
          subscription.unsubscribe();
        },
      };
    }

    const isBroadcastEvent = channel.startsWith("broadcast:");
    if (isBroadcastEvent) {
      const subscription = this.listenBroadcast(
        messageChannel,
        (event: any) => {
          return callback(event);
        },
      );

      return {
        unsubscribe: () => {
          subscription.unsubscribe();
        },
      };
    }

    throw new Error("Unhandled channel type");
  }

  listenBroadcast<Data>(channel: string, callback: (data: Data) => any) {
    this.redis.zadd(channel, Date.now(), this.client.id);

    const intervalID = setInterval(() => {
      this.redis.zadd(channel, Date.now(), this.client.id);
    }, 4000);

    const subscription = this.listenClientPubSub(channel, callback);

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
        clearInterval(intervalID);
        const isStillListening = this.isClientListeningToChannel(channel);
        if (!isStillListening) {
          this.redis.zrem(channel, this.client.id);
        }
      },
    };
  }

  async publishClientBroadcast<EventData>(
    channel: string,
    message: Message<EventData>,
  ) {
    // 1. get the list of clients subscribed to this channel
    // And delete outdated client that didn't renew their subscription
    const now = Date.now();
    const [_, members] = await Promise.all([
      this.redis.zremrangebyscore(channel, 0, now - 20_000),
      this.redis.zrange(channel, 0, now),
    ]);

    // 2. publish to their channel
    await Promise.all(
      members.map((clientId) =>
        this.publishClientPubSub(clientId, channel, message),
      ),
    );
  }

  async publishClientPubSub<EventData>(
    client: string,
    channel: string,
    message: Message<EventData>,
  ) {
    await this.redis.publish(
      `spawnkit:pubsub-clients:${client}`,
      superjson.stringify({
        channel,
        message,
      }),
    );
  }

  listenClientPubSub<Data>(channel: string, callback: (data: Data) => any) {
    if (!this.callbackByChannel.has(channel)) {
      this.callbackByChannel.set(channel, new Set<any>());
    }

    const callbacks = this.callbackByChannel.get(channel)!;
    callbacks.add(callback as any);
    const subscription = {
      unsubscribe: () => {
        callbacks.delete(callback as any);
        if (callbacks.size === 0) {
          this.callbackByChannel.delete(channel);
        }
      },
    };

    return subscription;
  }

  private isClientListeningToChannel(channel: string) {
    const callbacks = this.callbackByChannel.get(channel);
    if (!callbacks) {
      return false;
    }

    const hasActiveListeners = callbacks.size > 0;
    return hasActiveListeners;
  }

  async ack(
    instance: Adapters.InstanceIdentifier,
    channel: string,
    messageId: Adapters.EventId,
  ): Promise<true> {
    const messageChannel = this.getChannel(instance, channel);
    await Promise.all([
      this.redis.zrem(messageChannel, messageId),
      this.redis.hdel(messageChannel + ":data", messageId),
    ]);

    return true;
  }

  async has(
    instance: Adapters.InstanceIdentifier,
    channel: string,
  ): Promise<boolean> {
    const hashID = this.getChannel(instance, channel);
    const size = await this.redis.zcard(hashID);
    const hasUnprocessedEvents = size > 0;
    return hasUnprocessedEvents;
  }

  currentOrder = {
    timestamp: Date.now(),
    order: 0,
  };

  private getTimestampAndOrder = (): { timestamp: number, order: number } => {
    const timestamp = Date.now();

    const timestampChanged = this.currentOrder.timestamp !== timestamp;
    if (timestampChanged) {
      this.currentOrder = {
        timestamp,
        order: 0,
      };
    }

    this.currentOrder.order++;
    return this.currentOrder;
  }

  private async publishMQ<EventData>(
    channel: string,
    message: Message<EventData>,
  ) {
    const { timestamp, order } = this.getTimestampAndOrder();
    await Promise.all([
      this.redis.zadd(channel, timestamp, message.id),
      this.redis.hset(channel + ":data", message.id, superjson.stringify({ message, order })),
    ]);

    return {
      message,
      order
    }
  }

  private listenMQ(channel: string, callback: (event: any) => any) {
    const abortCtl = new AbortController();

    Promise.resolve().then(async () => {
      const previousEventsIds = new Set();
      const loop = {
        emptyRunsCount: 0,
        range: {
          from: 0,
          to: Infinity,
        }
      };

      while (!abortCtl.signal.aborted) {
        const timestampBeforeRequest = Date.now();
        const rawEvents = await this.getLatestMessagesRaw(channel, loop.range);
        const events = rawEvents.map((e => superjson.parse(e) as Awaited<ReturnType<typeof this.publishMQ>>))
          .sort((a, b) => a.order - b.order)
          .map(a => a.message);

        loop.range.from = timestampBeforeRequest;

        if (events.length) {
          events.forEach((event) => {
            if (abortCtl.signal.aborted) return;
            if (previousEventsIds.has(event.id)) return;
            callback(event as any);
          });
        }

        // Reset & update the list of processed events
        // So that we don't reprocess them when we fetch the next batch
        previousEventsIds.clear();
        events.forEach((event) => {
          previousEventsIds.add(event.id);
        });

        const isEmptyRun = previousEventsIds.size === 0;
        loop.emptyRunsCount = isEmptyRun ? loop.emptyRunsCount + 1 : 0;

        const MIN_WAIT_TIME = 0;
        const MAX_WAIT_TIME = 500;
        const MAX_EMPTY_RUNS = 5;

        const ratio = Math.min(MAX_EMPTY_RUNS, loop.emptyRunsCount) / MAX_EMPTY_RUNS;
        const waitTimeMs = lerp(MIN_WAIT_TIME, MAX_WAIT_TIME, ratio);
        await wait(waitTimeMs);
      }
    });

    return {
      unsubscribe: () => {
        abortCtl.abort();
      },
    };
  }

  private async getLatestMessagesRaw(
    channel: string,
    range: { from: number; to: number },
  ) {
    const messageIds = await this.redis.zrangebyscore(
      channel,
      range.from,
      range.to,
    );

    if (!messageIds.length) {
      return [];
    }

    const rawMessages = await this.redis.hmget(
      channel + ":data",
      ...messageIds,
    );

    const messages = rawMessages.flatMap((raw) => {
      if (raw) return [raw];
      return [];
    });

    return messages
  }
}
