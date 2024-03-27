import { Adapters } from "@/adapters";
import * as Spawnkit from "../src";
import * as Adapter from "../src/adapters/redis";
import { redis } from "../prisma";

import * as instances from "./instances";

const adapters: Adapters = {
  lock: new Adapter.Lock(redis),
  snapshot: new Adapter.Snapshot(redis),
  events: new Adapter.Event(redis),
  scheduler: new Adapter.Scheduler(redis),
  worker: new Adapter.Worker(redis, {
    concurrency: 50,
  }),
};

const worker = Spawnkit.Worker.listen({
  adapters,
  instances,
});

const client = Spawnkit.Client.from({
  adapters,
  instances,
});

const main = async () => {
  {
    const gameSession = client.actor("GameSession", 123213);
    await gameSession.send({ action: "jump" });
    await gameSession.get();
    gameSession.on("event", (event) => {});
    gameSession.on("data", (data) => {});
  }

  {
    const orderBook = client.actor("OrderBook", 123213);
    await orderBook.send({ order: "buy" });
    await orderBook.get();
    orderBook.on("event", (event) => {});
    orderBook.on("data", (data) => {});
  }

  {
    const LiveDocument = client.for("LiveDocument");
    const liveDoc = new LiveDocument(123213);
    liveDoc.send({ changes: {} });
    await liveDoc.get();
    liveDoc.on("event", (event) => {});
    liveDoc.on("data", (data) => {});
  }
};
