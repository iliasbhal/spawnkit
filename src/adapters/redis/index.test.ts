import { RedisMemoryServer } from "redis-memory-server";
import { Redis } from "ioredis";
import * as RedisAdapters from "./";
import { Adapters } from "../";
import { generateTestSuite } from "../generateTestSuite";

generateTestSuite("Redis Adapter", createGetAdapters);

describe("Redis Adapter", () => {
  describe("PubSub", () => {
    it.todo(
      "should clean up once an event has been consumed by all subscribers",
    );
  });
});

function createGetAdapters() {
  const redisServer = new RedisMemoryServer();

  const adapters = Promise.resolve().then(async () => {
    const redisClient = new Redis({
      host: await redisServer.getHost(),
      port: await redisServer.getPort(),
    });

    const adapters: Adapters = {
      lock: new RedisAdapters.Lock(redisClient),
      snapshot: new RedisAdapters.Snapshot(redisClient),
      messages: new RedisAdapters.MessageBroker(redisClient),
      pubsub: new RedisAdapters.PubSub(redisClient),
      scheduler: new RedisAdapters.Scheduler(redisClient),
    };

    return adapters;
  });

  return async () => {
    return await adapters;
  };
}
