import wait from "wait";
import * as Spawnkit from "@/.";
import { Adapters } from "@/adapters";
import * as RedisAdapter from "@/adapters/redis";
import { redis } from "@/adapters/redis/client";
import { OrderBook } from "../example/OrderBook";
import { ToggleMachine } from "../example/ToggleMachine";
import { GameSession } from "../example/GameSession";
import { AgentLLM } from "../example/AgentLLM";
import { ErrorExample } from "../example/ErrorExample";
import { StreamExample } from "../example/StreamExample";

export const adapters: Adapters = {
  lock: new RedisAdapter.Lock(redis),
  snapshot: new RedisAdapter.Snapshot(redis),
  messages: new RedisAdapter.MessageBroker(redis),
  pubsub: new RedisAdapter.PubSub(redis),
  scheduler: new RedisAdapter.Scheduler(redis),
};

const worker = Spawnkit.Worker.from({
  instances: {
    OrderBook,
    ToggleMachine,
    GameSession,
    AgentLLM,
    ErrorExample,
    StreamExample,
  },
  adapters,
});

const client = Spawnkit.Client.from({
  instances: {
    OrderBook,
    ToggleMachine,
    GameSession,
    AgentLLM,
    ErrorExample,
    StreamExample,
  },
  adapters,
});

const main = async () => {
  await redis.flushall("SYNC");
  worker.start();

  // attributeExample()
  // await basicExample();
  // await streamExample();
  await streamWithErrors();
  // await emittedEventsExample();
  // await scheduleCallExample();
  // await errorHandlingExample();
};

const attributeExample = () => {
  const exampleInst = client.spawn("StreamExample", "Hector");
  console.log(exampleInst.kind, exampleInst.id);
};

const basicExample = async () => {
  const orderBook = client.spawn("OrderBook", "BTC/EUR");

  // Example 1: call methods like the its a real reference.
  const response = await orderBook.buy({ tick: "APPL" });
  console.log(response);

  // Example 2: call the methods but don't wait for the response
  await orderBook.emit.buy({ tick: "APPL" });
  console.log("SENT");
};

const streamExample = async () => {
  const exampleInst = client.spawn("StreamExample", "Hector");
  console.log(exampleInst.kind, exampleInst.id);

  // const stream = await exampleInst.startStream({
  //   count: 4,
  // });

  // Example 1:  consume stream using .map
  // which returns a Promise that is resolved when the stream ends
  // await stream.map((data) => {
  //   console.log("RECEIVED ->", data);
  // });

  // Example 2: consume stream using an async iterator
  // for await (const data of stream) {
  //   console.log("STREAM ->", data);
  // }

  // We can also just emit and not read the stream
  // This will ensure the backend doesn't send message across the network
  // if the client doesn't intend to read them.
  // await exampleInst.emit.startStream({
  //   count: 4,
  // });
};

const streamWithErrors = async () => {
  const exampleInst = client.spawn("StreamExample", "Hector");
  console.log(exampleInst.kind, exampleInst.id);

  const erroredStream = await exampleInst.startFaultyStreamStart();
  try {
    // await erroredStream.map((data) => {
    //   console.log("RECEIVED ->", data);
    // });

    for await (const data of erroredStream) {
      console.log("STREAM ->", data);
    }
  } catch (err) {
    console.log("AN ERROR HANNPED", err);
  }

  // const erroredStream2 = await exampleInst.startFaultyStreamDuring();
  // try {
  //   await erroredStream2.map((data) => {
  //     console.log("RECEIVED ->", data);
  //   });

  //   // for await (const data of erroredStream2) {
  //   //   console.log("STREAM ->", data);
  //   // }
  // } catch (err) {
  //   console.log("AN ERROR HANNPED", err);
  // }
};

const emittedEventsExample = async () => {
  const orderBook = client.spawn("OrderBook", "BTC/USD");

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

const scheduleCallExample = async () => {
  const orderBook = client.spawn("OrderBook", "BTC/ETH");

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

const errorHandlingExample = async () => {
  const errorExample = client.spawn("ErrorExample", "LOL");

  try {
    const response = await errorExample.doSomething("aaa");
  } catch (err: any) {
    console.log(
      "caught error",
      err instanceof Spawnkit.RemoteError,
      err.name === "SomeSpetialError",
      err,
    );
  }
};

const startTime = Date.now();
console.log("START");
main()
  .then((result) => console.log("DONE", result))
  .catch((err) => console.error("ERR", err))
  .finally(() => {
    const timeSpent = Date.now() - startTime;
    console.log(timeSpent / 1000, "ms");
  });
