import 'dotenv/config';
import { wait } from "../src/utils/wait";
import * as Spawnkit from "@/.";
import * as RedisAdapter from "@/adapters/redis";
import { redis } from "@/adapters/redis/client";
import * as instances from "../example/_index";

const adapters = {
  lock: new RedisAdapter.Lock(redis),
  data: new RedisAdapter.Data(redis),
  messages: new RedisAdapter.MessageBroker(redis),
  events: new RedisAdapter.EventScheduler(redis),
  instances: new RedisAdapter.InstanceScheduler(redis),
  logger: new RedisAdapter.Logger(redis),
};

const client = Spawnkit.Client.from({
  adapters: adapters,
  instances: instances,
});

const main = async () => {
  await redis.flushall("SYNC");
  client.start();

  // attributeExample();
  await Promise.all([
    // basicExample(),
    // errorHandlingExample(),
    // streamExample(),
    // streamWithErrors(),
    // scheduleCallExample(),
    // emittedEventsExample(),
    // exampleXState(),
    exampleData(),
  ]);
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
  const subscription = orderBook.on("orders", (event) => {
    console.log("ON CLIENT 1", event);
  });

  // Example 1: call methods like the its a real reference.
  const response = await orderBook.buy({ tick: "APPL", qty: 10 });
  console.log("response", response);
  await wait(300);
  const response2 = await orderBook.buy({ tick: "APPL", qty: 50 });
  console.log("response2", response2);

  // Example 2: call the methods but don't wait for the response
  // await orderBook.skip.buy({ tick: "APPL" });
  // console.log("SENT");
  //
  subscription.unsubscribe();
};

const streamExample = async () => {
  const exampleInst = client.spawn("StreamExample", "Hector");
  console.log(exampleInst.kind, exampleInst.id);

  // Example 1:  consume stream using .map
  // which returns a Promise that is resolved when the stream ends
  const stream = await exampleInst.startStream({ count: 4 });
  await stream.map((data) => {
    console.log("RECEIVED ->", data);
  });

  // Example 2: consume stream using an async iterator
  // const stream = await exampleInst.startStream({ count: 4 });
  // for await (const data of stream) {
  //   console.log("STREAM ->", data);
  // }

  // We can also just emit and not read the stream
  // This will ensure the backend doesn't send message across the network
  // if the client doesn't intend to read them.
  // await exampleInst.skip.startStream({
  //   count: 4,
  // });
};

const streamWithErrors = async () => {
  const exampleInst = client.spawn("StreamExample", "Hector");
  console.log(exampleInst.kind, exampleInst.id);

  const erroredStream = await exampleInst.startFaultyStreamStart();

  console.log("1st stream");
  // try {
  //   // await erroredStream.map((data) => {
  //   //   console.log("RECEIVED ->", data);
  //   // });

  //   for await (const data of erroredStream) {
  //     console.log("STREAM ->", data);
  //   }
  // } catch (err) {
  //   console.log("AN ERROR HANNPED", err);
  // }

  // console.log("AFTER MAP");

  console.log("2nd stream");
  const erroredStream2 = await exampleInst.startFaultyStreamDuring();
  try {
    // await erroredStream2.map((data) => {
    //   console.log("RECEIVED 2 ->", data);
    // });

    for await (const data of erroredStream2) {
      console.log("STREAM ->", data);
    }
  } catch (err) {
    console.log("AN ERROR HANNPED 2", err);
  }
};

const emittedEventsExample = async () => {
  const orderBook = client.spawn("OrderBook", "BTC/USD");
  const orderBook2 = client.spawn("OrderBook", "ETH/USD");

  // Example 1: can emit from client and handle from instance
  // and from client as well
  orderBook.emit("alphachannel", "asddas");
  orderBook.emit("orders", ["asddas"]);
  orderBook.on("orders", (event) => {
    console.log("ON CLIENT 1", event);
  });

  orderBook2.on("orders", (event) => {
    console.log("ON CLIENT 2", event);
  });

  await orderBook.buy({ tick: "BTC/USD", qty: 1 });
  await orderBook.buy({ tick: "BTC/USD (via skip)", qty: 1 });

  await orderBook2.buy({ tick: "ETH/USD", qty: 1 });
  await orderBook2.buy({ tick: "ETH/USD (via skip)", qty: 1 });

  // const intervalId = setInterval(async () => {
  //   const isSkip = Math.random() > 0.5;
  //   if (isSkip) {
  //     orderBook.skip.buy({ tick: "APPL" });
  //     return;
  //   }

  //   const prev = Date.now();
  //   const response = await orderBook.buy({ tick: "APPL" });
  //   const then = Date.now();

  //   console.log("response", response, then - prev);
  // }, 25);

  await wait(10_000);
  // clearInterval(intervalId);
};

const scheduleCallExample = async () => {
  // const streamExample = client.spawn("StreamExample", "BTC/ETH");
  // const scheduleId = await streamExample
  //   .schedule({
  //     name: "Buy AAPL Regularly",
  //     delay: 2000,
  //     // cron: "* * * * *",
  //   })
  //   .startFaultyStreamDuring();

  // setInterval(async () => {
  //   const scheduled = await streamExample.scheduled.list();
  //   console.log("LIST", scheduled);
  //   const data = await streamExample.scheduled.get(scheduleId);
  //   console.log("DATA", data);
  // }, 10_000);

  // const orderBook = client.spawn("OrderBook", "BTC/ETH");

  // orderBook.emit("orders", ["asddsa"]);

  // const orderBook2 = client.spawn("OrderBook", "BTC/USD");
  // orderBook2.on("orders", (event) => {
  //   console.log("stream: ", event);
  // });

  // const scheduleId = await orderBook2
  //   .schedule({
  //     name: "Buy AAPL Regularly",
  //     delay: 2000,
  //     // cron: "* * * * *",
  //   })
  //   .buy({
  //     tick: "AAPL",
  //   });

  // const scheduled2 = await orderBook2.scheduled.list();
  // console.log("scheduled2", scheduled2);

  // const before = await orderBook.scheduled.list();
  // console.log("before", before);
  // await orderBook.scheduled.cancel(scheduleId);
  // const after = await orderBook.scheduled.list();
  // console.log("after", after);
  // await orderBook.scheduled.delete(scheduleId);
  // const after2 = await orderBook.scheduled.list();
  // console.log("after2", after2);

  // const scheduleId2 = await orderBook.schedule({ delay: 3000 }).buy({
  //   tick: "AAPL",
  // });

  // const before2 = await orderBook.scheduled.list();
  // console.log("before", before2.length);
  // await orderBook.scheduled.cancel(scheduleId2);
  // const after2 = await orderBook.scheduled.list();
  // console.log("after", after2.length);

  // await orderBook.schedule({ cron: "* * * * *" }).buy({
  //   tick: "AAPL",
  // });

  // await orderBook.schedule({ delay: 3000 }).buy({
  //   tick: "AAPL",
  // });

  // const list = await orderBook.scheduled.list();
  // console.log("allscheduled", list);

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
    );
    console.log(err);
  }
};

const exampleXState = async () => {
  const toggle = client.spawn("ToggleMachine", "AAAA");
  toggle.data.on("snapshot", (next) => {
    console.log("SUBSCRIBE", "KEY", "snapshot", next);
  });

  toggle.on("snapshot", () => {
    console.log("HEHEHEHEHEHHEHEHE");
  });
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
    toggle.send({ type: "TOGGLE" });
  }

  // const response = await toggle.send({ type: "TOGGLE" });
  // console.log(response);

  // const after = await toggle.data.get("snapshot");

  // console.log("after", after);
  // toggle.data.get();
};


const exampleData = async () => {
  const toggle = client.spawn("GameSession", "AAAA");
  const initial = await toggle.get();
  // console.log('BEFORE', initial);

  await toggle.set([['0', '0', '0'], ['1', '1', '1']]);
  const afterSave = await toggle.get();
  // console.log('AFTER', afterSave);


  // console.log('----------')

}

const startTime = Date.now();
console.log("START");
main()
  .then((result) => console.log("DONE"))
  .catch((err) => console.error("ERR", err))
  .finally(() => {
    const timeSpent = Date.now() - startTime;
    console.log(timeSpent, "ms");
  });
