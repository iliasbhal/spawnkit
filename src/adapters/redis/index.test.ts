import { RedisMemoryServer } from "redis-memory-server";
import { Redis } from "ioredis";
import * as RedisAdapters from "./";
import { Adapters } from "../";
import { generateTestSuite } from "../generateTestSuite";

generateTestSuite("Redis Adapter", createAdapterFactory);

describe("Redis Adapter", () => {
	describe("MessageBroker", () => {
		it.todo("should clean up once an event has been consumed by all subscribers");
	});
});

function createAdapterFactory() {
	const redisServer = new RedisMemoryServer();

	const adapters = Promise.resolve().then(async () => {
		const redisClient = new Redis({
			host: await redisServer.getHost(),
			port: await redisServer.getPort(),
		});

		const adapters: Adapters = {
			lock: new RedisAdapters.Lock(redisClient),
			data: new RedisAdapters.Data(redisClient),
			messages: new RedisAdapters.MessageBroker(redisClient),
			instances: new RedisAdapters.InstanceScheduler(redisClient),
			events: new RedisAdapters.EventScheduler(redisClient),
			logger: new RedisAdapters.Logger(redisClient),
		};

		return adapters;
	});

	return async () => {
		return await adapters;
	};
}
