import wait from "wait";
import { Adapters } from "@/adapters";
import * as Adapter from "@/adapters/redis";
import { redis } from "@/adapters/redis/client";
import * as Spawnkit from "../src";
import { OrderBook } from "../example/OrderBook";

export const adapters: Adapters = {
  lock: new Adapter.Lock(redis),
  snapshot: new Adapter.Snapshot(redis),
  events: new Adapter.Event(redis),
  eventBus: new Adapter.EventBus(redis),
  scheduler: new Adapter.Scheduler(redis),
  worker: new Adapter.Worker(redis, {
    concurrency: 50,
  }),
};

const worker = Spawnkit.Worker.from({
  adapters,
  instances: { OrderBook },
});

// import type * as instances from "./instances";
const client = Spawnkit.Client.from({
  adapters,
  instances: { OrderBook },
});

// worker.start();

const main = async () => {
  // await redis.flushall();
  worker.start();

  const orderBook = client.actor("OrderBook", 111);

  orderBook.on("change", (event) => {
    console.log("CHANGE RECEIVED", event);
  });

  const intervalId = setInterval(async () => {
    const isJust = Math.random() > 0.5;
    if (isJust) {
      orderBook.just.buy({ tick: "APPL" });
      return;
    }

    const response = await orderBook.buy({ tick: "APPL" });
    console.log("response", response);
  }, 1000);

  await wait(10_000);
  clearInterval(intervalId);
};

main()
  .then((result) => console.log("DONE", result))
  .catch((err) => console.error("ERR", err));
