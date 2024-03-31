import * as Spawnkit from "../src";
import * as instances from "../example/instances";
import { Adapters } from "@/adapters";
import * as Adapter from "@/adapters/redis";
import { redis } from "@/adapters/redis/client";
import wait from "wait";

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
  instances,
});

// import type * as instances from "./instances";
const client = Spawnkit.Client.from({
  adapters,
  instances: {} as typeof instances,
});

// worker.start();

const main = async () => {
  // await redis.flushall();
  worker.start();

  const toggle = client.actor("OrderBook", 111);

  const intervalId = setInterval(async () => {
    const response = await toggle.buy({ tick: "APPL" });
    console.log("response", response);
  }, 1);

  await wait(10_000);
  clearInterval(intervalId);
};

main()
  .then((result) => console.log("DONE", result))
  .catch((err) => console.error("ERR", err));
