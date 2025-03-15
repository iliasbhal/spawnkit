import { nanoid } from "nanoid";
import * as Adapters from "../../index";
import { RedisAdapter, Serde } from "./_base";
import { BackoffController } from "@/utils/BackoffContoller";

interface Message<DataShape> {
	id: Adapters.EventId;
	data: DataShape;
	meta: {
		origin: string;
	};
}

export class MessageBroker extends RedisAdapter implements Adapters.AdapaterMessageBroker {
	messageBrokerId = nanoid();

	private callbackByChannel = new Map<string, Set<Parameters<typeof this.subscribe>[2]>>();

	getClientChannel() {
		return this.getOriginChannel(this.messageBrokerId);
	}

	getOriginChannel(originId: string) {
		const channel = `spawnkit:pubsub-clients:${originId}`;
		return channel;
	}

	isInitialized = false;
	ensureInitializedClientPubSub() {
		if (this.isInitialized) return;
		this.isInitialized = true;

		const clientChannel = this.getClientChannel();

		return this.redisSubscribe(clientChannel, async (message) => {
			const parsed = await Serde.deserialize(message) as any;

			const callbacks = this.callbackByChannel.get(parsed.channel);
			if (callbacks) {
				callbacks.forEach((callback) => {
					callback(parsed.message);
				});
			}
		})
	}

	private getChannel(instance: Adapters.InstanceIdentifier, channel: string) {
		return `spawnkit:messages:${instance.kind}:${instance.id}:${channel}`;
	}

	async publish<EventData>(
		instance: Adapters.InstanceIdentifier,
		channel: Adapters.MessageChannel,
		event: EventData,
	): Promise<Adapters.EventId> {
		const messageChannel = this.getChannel(instance, channel);
		const eventId = nanoid();
		const message: Message<EventData> = {
			id: eventId,
			data: event,
			meta: {
				origin: this.messageBrokerId,
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
			if (!rpcIncomingMessageId) throw new Error("Bad Reply: Missing Message Id");
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
		this.ensureInitializedClientPubSub();

		const messageChannel = this.getChannel(instance, channel);
		const isRpcCall = channel.startsWith("rpc");
		if (isRpcCall) {
			const subscription = this.listenMQ(messageChannel, (event) => {
				const replyToClient = event.meta.origin;
				if (replyToClient) {
					this.rpcOriginByMessageId.set(event.id, event.meta.origin);
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
			const subscription = this.listenClientPubSub(messageChannel, (event: any) => {
				return callback(event);
			});

			return {
				unsubscribe: () => {
					subscription.unsubscribe();
				},
			};
		}

		const isBroadcastEvent = channel.startsWith("broadcast:");
		if (isBroadcastEvent) {
			const subscription = this.listenBroadcast(messageChannel, (event: any) => {
				return callback(event);
			});

			return {
				unsubscribe: () => {
					subscription.unsubscribe();
				},
			};
		}

		throw new Error("Unhandled channel type");
	}

	listenBroadcast<Data>(channel: string, callback: (data: Data) => any) {
		this.redis.zadd(channel, Date.now(), this.messageBrokerId);

		const intervalID = setInterval(() => {
			this.redis.zadd(channel, Date.now(), this.messageBrokerId);
		}, 4000);

		const subscription = this.listenClientPubSub(channel, callback);

		return {
			unsubscribe: () => {
				subscription.unsubscribe();
				clearInterval(intervalID);
				const isStillListening = this.isClientListeningToChannel(channel);
				if (!isStillListening) {
					this.redis.zrem(channel, this.messageBrokerId);
				}
			},
		};
	}

	async publishClientBroadcast<EventData>(channel: string, message: Message<EventData>) {
		// 1. get the list of clients subscribed to this channel
		// And delete outdated client that didn't renew their subscription
		const now = Date.now();
		const [_, members] = await Promise.all([
			this.redis.zremrangebyscore(channel, 0, now - 20_000),
			this.redis.zrange(channel, 0, now),
		]);

		// 2. publish to their channel
		await Promise.all(
			members.map((originId) => this.publishClientPubSub(originId, channel, message)),
		);
	}

	async publishClientPubSub<EventData>(
		originId: string,
		channel: string,
		message: Message<EventData>,
	) {

		const serialized = await Serde.serialize({
			channel,
			message,
		});

		const originChannel = this.getOriginChannel(originId);
		await this.redis.publish(originChannel, serialized);
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

	async has(instance: Adapters.InstanceIdentifier, channel: string): Promise<boolean> {
		const hashID = this.getChannel(instance, channel);
		const size = await this.redis.zcard(hashID);
		const hasUnprocessedEvents = size > 0;
		return hasUnprocessedEvents;
	}

	currentOrder = {
		timestamp: Date.now(),
		order: 0,
	};

	private getTimestampAndOrder = (): { timestamp: number; order: number } => {
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
	};

	private async publishMQ<EventData>(channel: string, message: Message<EventData>) {
		const { timestamp, order } = this.getTimestampAndOrder();
		const serialized = await Serde.serialize({
			message,
			order,
		});

		await Promise.all([
			this.redis.zadd(channel, timestamp, message.id),
			this.redis.hset(channel + ":data", message.id, serialized),
		]);

		return {
			message,
			order,
		};
	}

	private listenMQ(channel: string, callback: (event: any) => any) {
		const timestampListeningStarted = Date.now();

		const abortCtl = new AbortController();
		const previousEventsIds = new Set();
		const loop = {
			range: {
				from: 0,
				to: Infinity,
			},
		};

		const backoff = BackoffController.new({
			strategy: BackoffController.LERP,
			minWaitTime: 0,
			maxWaitTime: 1000,
			stepCount: 25,
		});

		Promise.resolve().then(async () => {
			while (!abortCtl.signal.aborted) {
				const timestampBeforeRequest = loop.range.from === 0 ? timestampListeningStarted : Date.now();
				const rawEvents = await this.getLatestMessagesRaw(channel, loop.range);
				loop.range.from = timestampBeforeRequest;

				type PublishedEvent = Awaited<ReturnType<typeof this.publishMQ>>;
				const events = await Promise.all(
					rawEvents.map((e) => Serde.deserialize<PublishedEvent>(e))
				);

				const eventMessages = events.sort((a, b) => a.order - b.order)
					.map((a) => a.message);


				if (eventMessages.length) {
					eventMessages.forEach((event) => {
						if (abortCtl.signal.aborted) return;
						if (previousEventsIds.has(event.id)) return;
						callback(event as any);
					});
				}

				// Reset & update the list of processed events
				// So that we don't reprocess them when we fetch the next batch
				previousEventsIds.clear();
				eventMessages.forEach((event) => {
					previousEventsIds.add(event.id);
				});

				const isEmptyRun = previousEventsIds.size === 0;
				if (isEmptyRun) backoff.reset();
				await backoff.waitUntilNextAttempt();
			}
		});

		return {
			unsubscribe: () => {
				abortCtl.abort();
			},
		};
	}

	private async getLatestMessagesRaw(channel: string, range: { from: number; to: number }) {
		const messageIds = await this.redis.zrangebyscore(channel, range.from, range.to);

		if (!messageIds.length) {
			return [];
		}

		const rawMessages = await this.redis.hmget(channel + ":data", ...messageIds);

		const messages = rawMessages.flatMap((raw) => {
			if (raw) return [raw];
			return [];
		});

		return messages;
	}
}
