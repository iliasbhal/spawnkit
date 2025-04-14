import { RedisMemoryServer } from "redis-memory-server";
import { Redis } from "ioredis";
import { generateTestSuite } from "../generateTestSuite";
import * as Spawnkit from '../../index';

generateTestSuite("Redis Adapter / Core", createAdapterFactory);

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

		const adapter = new Spawnkit.Adapters.RedisAdapter(redisClient);
		return adapter;
	});

	return async () => {
		return await adapters;
	};
}
