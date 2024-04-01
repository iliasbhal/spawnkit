import wait from "wait";
import { Adapters } from "@/adapters";
import * as Adapter from "@/adapters/redis";
import { redis } from "@/adapters/redis/client";
import * as Spawnkit from "../src";
import { OrderBook } from "../example/OrderBook";
import { ToggleMachine } from "../example/ToggleMachine";
import { GameSession } from "../example/GameSession";
import { AgentLLM } from "../example/AgentLLM";

export const adapters: Adapters = {
  lock: new Adapter.Lock(redis),
  snapshot: new Adapter.Snapshot(redis),

  events: new Adapter.Event(redis),
  pubsub: new Adapter.PubSub(redis),

  scheduler: new Adapter.Scheduler(redis),
  worker: new Adapter.Worker(redis, {
    concurrency: 50,
  }),
};

const worker = Spawnkit.Worker.from({
  instances: { OrderBook, ToggleMachine, GameSession, AgentLLM },
  adapters,
});

// import type * as instances from "./instances";
const client = Spawnkit.Client.from({
  instances: { OrderBook, ToggleMachine, GameSession, AgentLLM },
  adapters,
});

// worker.start();

const main = async () => {
  await redis.flushall();
  worker.start();

  const agentAI = client.actor("AgentLLM", 111);

  const stream = await agentAI.prompt({
    model: "claude3",
    prompt: "blabla",
    taskId: "asdasd",
  });

  // TWO API to consume a stream
  for await (const data of stream) {
    console.log("DAMN ->", data);
  }

  // await stream.map((data) => {
  //   console.log("DAMN ->", data);
  // });

  // const orderBook = client.actor("OrderBook", 111);
  // orderBook.on("change", (event) => {
  //   console.log("CHANGE RECEIVED", event);
  // });

  // const intervalId = setInterval(async () => {
  //   const isJust = Math.random() > 0.5;
  //   if (isJust) {
  //     orderBook.emit.buy({ tick: "APPL" });
  //     return;
  //   }

  //   const prev = Date.now();
  //   const response = await orderBook.buy({ tick: "APPL" });
  //   const then = Date.now();

  //   console.log("response", response, then - prev);
  // }, 25);

  // await wait(10_000);
  // clearInterval(intervalId);
};

main()
  .then((result) => console.log("DONE", result))
  .catch((err) => console.error("ERR", err));
