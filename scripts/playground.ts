import wait from "wait";
import * as Spawnkit from "@/.";
import * as RedisAdapter from "@/adapters/redis";
import { redis } from "@/adapters/redis/client";
import {
  StreamExample,
  AgentLLM,
  OrderBook,
  ToggleMachine,
  ErrorExample,
} from "../example/_index";

const spawnConfig = {
  adapters: {
    lock: new RedisAdapter.Lock(redis),
    data: new RedisAdapter.Data(redis),
    messages: new RedisAdapter.MessageBroker(redis),
    scheduler: new RedisAdapter.Scheduler(redis),
  },
  instances: {
    StreamExample,
    AgentLLM,
    ToggleMachine,
    OrderBook,
    ErrorExample,
  },
} satisfies Spawnkit.SpawnkitConfig;

const worker = Spawnkit.Worker.from(spawnConfig);
const client = Spawnkit.Client.from(spawnConfig);

const main = async () => {
  // await redis.flushall("SYNC");
  worker.start();

  // attributeExample()
  await basicExample();
  // await streamExample();
  // await streamWithErrors();
  // await emittedEventsExample();
  // await scheduleCallExample();
  // await errorHandlingExample();
  // await exampleXState();
};

const attributeExample = () => {
  const exampleInst = client.spawn("StreamExample", "Hector");
  console.log(exampleInst.kind, exampleInst.id);
};

// class OrderBuuk {
//   static withId(sss: stirng) {}
// }

// const orderBook = OrderBuuk.spawn("BTC/EUR");

const basicExample = async () => {
  const orderBook = client.spawn("OrderBook", "BTC/EUR");

  // Example 1: call methods like the its a real reference.
  const response = await orderBook.buy({ tick: "APPL" });
  console.log(response);

  // Example 2: call the methods but don't wait for the response
  // await orderBook.emit.buy({ tick: "APPL" });
  // console.log("SENT");
};

const streamExample = async () => {
  const exampleInst = client.spawn("StreamExample", "Hector");
  console.log(exampleInst.kind, exampleInst.id);

  // Example 1:  consume stream using .map
  // which returns a Promise that is resolved when the stream ends
  // const stream = await exampleInst.startStream({ count: 4 });
  // await stream.map((data) => {
  //   console.log("RECEIVED ->", data);
  // });

  // Example 2: consume stream using an async iterator
  // const stream = await exampleInst.startStream({ count: 4 });
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

  // const erroredStream = await exampleInst.startFaultyStreamStart();
  // try {
  //   await erroredStream.map((data) => {
  //     console.log("RECEIVED ->", data);
  //   });

  //   // for await (const data of erroredStream) {
  //   //   console.log("STREAM ->", data);
  //   // }
  // } catch (err) {
  //   console.log("AN ERROR HANNPED", err);
  // }

  const erroredStream2 = await exampleInst.startFaultyStreamDuring();
  try {
    await erroredStream2.map((data) => {
      console.log("RECEIVED ->", data);
    });

    // for await (const data of erroredStream2) {
    //   console.log("STREAM ->", data);
    // }
  } catch (err) {
    console.log("AN ERROR HANNPED", err);
  }
};

const emittedEventsExample = async () => {
  const orderBook = client.spawn("OrderBook", "BTC/USD");
  const orderBook2 = client.spawn("OrderBook", "ETH/USD");

  orderBook2.on("orders", (event) => {
    console.log("CHANGE RECEIVED on 2", event);
  });

  orderBook.on("orders", (event) => {
    console.log("CHANGE RECEIVED on 1", event);
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

const exampleXState = async () => {
  const toggle = client.spawn("ToggleMachine", "AAAA");
  // toggle.data.on("snapshot", (next) => {
  //   console.log("SUBSCRIBE", "KEY", "snapshot", next);
  // });
  // await toggle.init([1, 2, 3]);
  // await toggle.init([1, 2, 3]);
  // const before = await toggle.data.get("snapshot");
  // console.log("before", before);

  // const snap1 = await toggle.create(undefined);
  // console.log("snap1", snap1);

  // const snap2 = await toggle.data.get("snapshot");
  // console.log("snap2", snap2);

  for (let i = 0; i < 1000; i++) {
    await wait(0);
    console.log(i);
    await toggle.send({ type: "TOGGLE" });
  }

  // const response = await toggle.send({ type: "TOGGLE" });
  // console.log(response);

  // const after = await toggle.data.get("snapshot");

  // console.log("after", after);
  // toggle.data.get();
};

const startTime = Date.now();
console.log("START");
main()
  .then((result) => console.log("DONE"))
  .catch((err) => console.error("ERR", err))
  .finally(() => {
    const timeSpent = Date.now() - startTime;
    console.log(timeSpent, "ms");
  });
