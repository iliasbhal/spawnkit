import { Redis } from "ioredis";
import * as BullMQ from "bullmq";
import { BaseAdapter } from "../../../adapters";

import SuperJSON from "superjson";
import * as MsgPack from "@msgpack/msgpack"

export class RedisAdapter extends BaseAdapter {
	redis: Redis;

	constructor(redis: Redis) {
		super();

		this.redis = redis;
	}

	getNewRedisClient() {
		const redisConfig = this.redis.options;
		const client = new Redis(redisConfig);
		return client;
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
