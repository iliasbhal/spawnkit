import { RedisMemoryServer } from "redis-memory-server";
import { Redis } from "ioredis";
import * as Adapters from "./redis";
import wait from "wait";
import { waitFor } from "poll-until-promise";

describe("Redis Adapter", () => {
  const { redisServer, getRedisClient } = createRedisClientFactory();
  afterAll(async () => {
    await redisServer.stop();
  });

  describe("EventBus", () => {
    const creatStreamId = createStreamIdGenerator();

    it("should be able to emit and receive events ", async () => {
      const redisClient = await getRedisClient();
      const streamId = creatStreamId();
      const eventBus = new Adapters.EventBus(redisClient);
      const callback = jest.fn();
      const sub = eventBus.on(streamId, callback);
      await eventBus.emit(streamId, { aaa: true });

      await waitUntilOK(() => {
        expect(callback).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith({ aaa: true });
        sub.unsubscribe();
      });
    });

    it("should not receive event on different channels ", async () => {
      const redisClient = await getRedisClient();
      const streamId = creatStreamId();
      const streamId2 = creatStreamId();
      const eventBus = new Adapters.EventBus(redisClient);
      const callback = jest.fn();
      const sub = eventBus.on(streamId, callback);
      await eventBus.emit(streamId2, { aaa: true });

      await wait(1000);
      expect(callback).not.toHaveBeenCalled();
      sub.unsubscribe();
    });

    it("should trigger the callback on every emitted value", async () => {
      const redisClient = await getRedisClient();
      const streamId = creatStreamId();
      const eventBus = new Adapters.EventBus(redisClient);
      const callback = jest.fn();
      const sub = eventBus.on(streamId, callback);
      await eventBus.emit(streamId, { test: 1 });
      await wait(10);

      await eventBus.emit(streamId, { test: 2 });
      await eventBus.emit(streamId, { test: 3 });

      await wait(10);

      await eventBus.emit(streamId, { test: 4 });

      await waitUntilOK(() => {
        expect(callback).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledTimes(4);
        expect(callback).toHaveBeenCalledWith({ test: 1 });
        sub.unsubscribe();
      });
    });

    it("should allow for several subscriber to receive events", async () => {
      const redisClient = await getRedisClient();
      const streamId = creatStreamId();
      const eventBus = new Adapters.EventBus(redisClient);

      const subscribers = Array.from({ length: 16 }).map(() => {
        const callback = jest.fn();
        const subscription = eventBus.on(streamId, callback);
        return {
          callback,
          subscription,
        };
      });

      await eventBus.emit(streamId, { aaa: true });

      await waitUntilOK(() => {
        subscribers.forEach(({ callback, subscription }) => {
          expect(callback).toHaveBeenCalled();
          expect(callback).toHaveBeenCalledTimes(1);
          expect(callback).toHaveBeenCalledWith({ aaa: true });
          subscription.unsubscribe();
        });
      });
    });

    it.todo(
      "should clean up once an event has been consumed by all subscribers",
    );
  });
});

function createRedisClientFactory() {
  const redisServer = new RedisMemoryServer();

  const waitForRedisClient = Promise.all([
    redisServer.getHost(),
    redisServer.getPort(),
  ]).then(([host, port]) => {
    const redisClient = new Redis({ host, port });
    return redisClient;
  });

  return {
    redisServer,
    getRedisClient: async () => {
      return await waitForRedisClient;
    },
  };
}

function createStreamIdGenerator() {
  let i = 0;
  return () => `stream:${i++}`;
}

async function waitUntilOK(callback: Function) {
  await waitFor(callback, {
    interval: 10,
  });
}
