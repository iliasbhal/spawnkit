import 'dotenv/config';

import { RedisMemoryServer } from "redis-memory-server";
import { redis } from './adapters/redis/client'

import * as Spawnkit from ".";
import * as RedisAdapter from "./adapters/redis";
import * as instances from "../example/_index";

const createNewClientFactory = () => {
  const redisServer = new RedisMemoryServer();

  const adapters = Promise.resolve().then(async () => {
    return {
      lock: new RedisAdapter.Lock(redis),
      data: new RedisAdapter.Data(redis),
      messages: new RedisAdapter.MessageBroker(redis),
      events: new RedisAdapter.EventScheduler(redis),
      instances: new RedisAdapter.InstanceScheduler(redis),
      logger: new RedisAdapter.Logger(redis),
    };
  });

  return async () => Spawnkit.Client.from({
    adapters: await adapters,
    instances: instances,
  });
}

describe.only("Base", () => {
  const createClient = createNewClientFactory();

  it("client can use instance methods", async () => {
    const client = await createClient();
    const orderbook = client.spawn('OrderBook', 'BTC/EUR');
    const order = await orderbook.buy({ tick: 'APPL', qty: 10 });
    expect(order).toEqual({
      success: true,
      status: "pending...",
      order: { tick: 'APPL', qty: 10 }
    });
  });
  it.todo("can call for instance method and not wait for the resonse");
});

describe("Errors", () => {
  it.todo("forwards message, stacktrace and other attributes");
  it.todo("forwards errors thrown during the method call (sync method)");
  it.todo("forwards errors thrown during the method call (async method)");
  it.todo("forwards error if happen during stream ( .map )");
  it.todo("forwards error if happen during stream ( for await )");
});

describe("Data", () => {
  it.todo("can use .data.get() remotely");
  it.todo("can subscribe to data changes via .data.on('key', subscriber)");
});

describe("Stream", () => {
  it.todo("forwards returned stream to client (.map)");
  it.todo("forwards returned stream to client (async iterator)");
  it.todo("should replay messages in the same order they have been emitted");
});

describe("Schedule", () => {
  it.todo("can schedule method call (delay)");
  it.todo("can cancel schedule method call (delay)");
  it.todo("can schedule method call (cron)");
  it.todo("can cancel schedule method call (cron)");
  it.todo("can list all scheduled method call");
});

describe("PubSub", () => {
  it.todo("can emit and listen to instance channels");
  it.todo("when subscrbing to channel, it should not replay past events");
});
