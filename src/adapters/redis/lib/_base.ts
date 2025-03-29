import { Redis } from "ioredis";
import * as BullMQ from "bullmq";
import { BaseAdapter } from "../../../adapters";

import SuperJSON from "superjson";
import * as MsgPack from "@msgpack/msgpack"

export class RedisAdapter extends BaseAdapter {
	redis: Redis;
	pubsubRedis: Redis;

	constructor(redis: Redis) {
		super();

		this.redis = this.cloneRedisClient(redis);
		this.pubsubRedis = this.cloneRedisClient(redis);
		this.startHandlingPubSub();
	}

	private cloneRedisClient(redis: Redis) {
		const redisConfig = redis.options;
		const client = new Redis(redisConfig);
		return client;
	}

	startHandlingPubSub() {
		this.pubsubRedis.on("message", async (clientChannel, message) => {
			const callbacks = this.globalPubSubCallbacksByChannels.get(clientChannel)!;
			if (!callbacks) return;

			callbacks?.forEach((callback) => {
				callback(message);
			});
		});
	}

	globalPubSubCallbacksByChannels = new Map<string, Set<Parameters<typeof this.globalSubscribe>[1]>>();
	globalSubscribe(channel: string, callback: (event: any) => any) {
		if (!this.globalPubSubCallbacksByChannels.has(channel)) {
			this.globalPubSubCallbacksByChannels.set(channel, new Set<any>());
		}

		const callbacks = this.globalPubSubCallbacksByChannels.get(channel)!;
		callbacks.add(callback);

		this.pubsubRedis.subscribe(channel)
			.then(() => result.live = true)
			.catch(() => result.live = false);

		const result = {
			live: false,
			unsubscribe() {
				callbacks.delete(callback);
			},
		}

		return result;;
	}
}

export class BaseQueue extends RedisAdapter {
	createQueue(name: string) {
		return new BullMQ.Queue(name, {
			connection: this.redis,
			prefix: "spawnkit:queues",
			defaultJobOptions: {
				removeOnComplete: true,
				removeOnFail: true,
			},
		});
	}

	createWorker<JobData>(queue: BullMQ.Queue, callback: (job: BullMQ.Job<JobData>) => Promise<void>) {
		return new BullMQ.Worker<JobData>(
			queue.name,
			async (job) => {
				await callback(job);
			},
			{
				autorun: true,
				concurrency: 10 ** 9,
				connection: queue.opts.connection,
				prefix: queue.opts.prefix,
			},
		)
	}
}

export class Serde {
	static async serialize(data: any): Promise<string> {
		return SuperJSON.stringify(data);

		const dataAsU8Array = await MsgPack.encode(data, { ignoreUndefined: true })
		const stringified = SuperJSON.stringify(dataAsU8Array);
		return stringified;
	}

	static async deserialize<Expected = unknown>(raw: Awaited<ReturnType<(typeof Serde)["serialize"]>>): Promise<Expected> {
		return SuperJSON.parse(raw)

		const uintArr = SuperJSON.parse(raw) as Uint8Array
		return await MsgPack.decode(uintArr) as Expected;
	}
}
