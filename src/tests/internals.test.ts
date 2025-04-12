import * as Spawnkit from "..";
import { wait } from "../utils/wait";
import { testRedisAdapters } from "./_utils";

describe("Utils", () => {
  class Example extends Spawnkit.Instance<{}, {}> {
    async initialize() {
      await wait(1000);
    }

    doSomething(msg: string) {
      return true;
    }

    someMethod() {

    }
  }

  const client = Spawnkit.Client.from({
    adapter: testRedisAdapters,
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
    expect(latency.up).toBeGreaterThanOrEqual(0);
    expect(latency.down).toBeGreaterThanOrEqual(0);
    expect(latency.total).toBeGreaterThanOrEqual(latency.up + latency.down);
  });

});
