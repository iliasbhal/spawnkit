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
  messages: new Adapter.MessageBroker(redis),
  pubsub: new Adapter.PubSub(redis),
  scheduler: new Adapter.Scheduler(redis),
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

const main = async () => {
  await redis.flushall("SYNC");
  worker.start();

  // await basicExample();
  // await streamExample();
  // await actorEmittedEventsExample();
  await scheduleCallExample();
};

const streamExample = async () => {
  const agentAI = client.actor("AgentLLM", 111);

  const stream = await agentAI.prompt({
    model: "claude3",
    prompt: "blabla",
    taskId: "asdasd",
  });

  // Example 1:  consume stream using .map
  // which returns a Promise that is resolved when the stream ends
  await stream.map((data) => {
    console.log("STREAM ->", data);
  });

  // Example 2: consume stream using an async iterator
  // for await (const data of stream) {
  //   console.log("STREAM ->", data);
  // }
};

const actorEmittedEventsExample = async () => {
  const orderBook = client.actor("OrderBook", 222);

  orderBook.on("orders", (event) => {
    console.log("CHANGE RECEIVED", event);
  });

  const intervalId = setInterval(async () => {
    const isJust = Math.random() > 0.5;
    if (isJust) {
      orderBook.emit.buy({ tick: "APPL" });
      return;
    }

    const prev = Date.now();
    const response = await orderBook.buy({ tick: "APPL" });
    const then = Date.now();

    console.log("response", response, then - prev);
  }, 25);

  await wait(10_000);
  clearInterval(intervalId);
};

const basicExample = async () => {
  const orderBook = client.actor("OrderBook", 111);

  orderBook.on("orders", (event) => {
    console.log("CHANGE RECEIVED", event);
  });

  // Example 1: call methods like the its a real reference.
  const response = await orderBook.buy({ tick: "APPL" });
  console.log(response);

  // Example 2: call the methods but don't wait for the response
  await orderBook.emit.buy({ tick: "APPL" });
  console.log("SENT");
};

const scheduleCallExample = async () => {
  const orderBook = client.actor("OrderBook", 111);

  const scheduleId = await orderBook.cron("* * * * *").buy({
    tick: "AAPL",
  });

  const before = await orderBook.scheduled.list();
  console.log("before", before.length);
  await orderBook.scheduled.cancel(scheduleId);
  const after = await orderBook.scheduled.list();
  console.log("after", after.length);

  const scheduleId2 = await orderBook.delay(3000).buy({
    tick: "AAPL",
  });

  const before2 = await orderBook.scheduled.list();
  console.log("before", before2.length);
  await orderBook.scheduled.cancel(scheduleId2);
  const after2 = await orderBook.scheduled.list();
  console.log("after", after2.length);

  await orderBook.cron("* * * * *").buy({
    tick: "AAPL",
  });

  await orderBook.delay(3000).buy({
    tick: "AAPL",
  });

  const list = await orderBook.scheduled.list();
  console.log("allscheduled", list);

  // orderBook.scheduled.cancel(scheduleId);
  orderBook.on("orders", (event) => {
    console.log("stream: ", event);
  });

  await wait(5000);
};

console.log("START");
main()
  .then((result) => console.log("DONE", result))
  .catch((err) => console.error("ERR", err));
