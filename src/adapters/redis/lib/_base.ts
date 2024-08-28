import { Redis } from "ioredis";
import SuperJSON from 'superjson';
import * as BullMQ from "bullmq";
import { BaseAdapter } from "../../../adapters";

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
	static serialize(data: any) {
		return SuperJSON.stringify(data);
	}
	static deserialize<Expected = unknown>(data: ReturnType<typeof Serde['serialize']>) {
		return SuperJSON.parse<Expected>(data);
	}
}