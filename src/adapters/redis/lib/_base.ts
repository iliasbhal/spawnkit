import { Redis } from "ioredis";
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
