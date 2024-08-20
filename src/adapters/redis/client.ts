import { Redis, RedisOptions } from "ioredis";

export const redisConfig: RedisOptions = {
	port: parseInt(process.env.REDIS_PORT!),
	host: process.env.REDIS_HOST,
	maxRetriesPerRequest: 0,
	enableAutoPipelining: true,
	showFriendlyErrorStack: true,
};

export const redis = new Redis(redisConfig);
