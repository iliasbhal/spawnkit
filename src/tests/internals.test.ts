import "dotenv/config";

import { redis } from "../adapters/redis/client";

import * as Spawnkit from "..";
import * as RedisAdapter from "../adapters/redis";
import { wait } from "../utils/wait";
import { nanoid } from "nanoid";

describe("Utils", () => {
  class Example extends Spawnkit.Instance<{}, { somekey: number }, {}> {
    async initialize() {
      await wait(1000);
    }

    doSomething(msg: string) {
      return true;
    }

    someMethod() {

    }
  }

  const createAdapters = () => ({
    lock: new RedisAdapter.Lock(redis),
    data: new RedisAdapter.Data(redis),
    messages: new RedisAdapter.MessageBroker(redis),
    events: new RedisAdapter.EventScheduler(redis),
    instances: new RedisAdapter.InstanceScheduler(redis),
    logger: new RedisAdapter.Logger(redis),
  });

  const client = Spawnkit.Client.from({
    adapters: createAdapters(),
    instances: {
      Example,
    },
  });

  client.start();

  it('can ensure if instance is live', async () => {
    const orderbook = client.spawn("Example", "1", {
      aaaaaaa: 'aaaaaa',
    });

    const now = Date.now();
    const isLive = await orderbook.remote.ensureLive();
    const timeSpent = Date.now() - now;

    const now2 = Date.now();
    const isLive2 = await orderbook.remote.ensureLive();
    const timeSpent2 = Date.now() - now2;

    expect(isLive).toBe(true);
    expect(isLive2).toBe(true);

    expect(timeSpent).toBeGreaterThan(1000);
    expect(timeSpent2).toBeLessThan(timeSpent);
  })

  it('can get instance latency numbers', async () => {
    const orderbook = client.spawn("Example", "1", {
      aaaaaaa: 'bbbbbb',
    });

    const latency = await orderbook.remote.getLatency();
    expect(latency.up).toBeGreaterThan(0);
    expect(latency.down).toBeGreaterThanOrEqual(0);
    expect(latency.total).toBeGreaterThan(0);
    expect(latency.total).toEqual(latency.up + latency.down);
  })

  it('can control instance request concurrency', async () => {

  })

  it('can update  instance request concurrency on the fly', async () => {

  })

  it('can lock instance from accepting requests', async () => {

  })

  it('can unlock instance to restart accepting requests', async () => {

  })

  it('includes a sqlite database with each instance', () => {

  });

});
