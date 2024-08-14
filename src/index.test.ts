import 'dotenv/config';

import { redis } from './adapters/redis/client'

import * as Spawnkit from ".";
import * as RedisAdapter from "./adapters/redis";
import { ControlledPromise } from './utils/ControlledPromise';
import { OrderBook } from './index.test.fixtures'

describe.only("Base", () => {
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
      OrderBook,
    },
  });

  client.start();

  it('should not allow usage of reserved keywords', () => {
    // RESERVED KEYWORDS are the properties that are used internally by the client 
    // And that are not part of the instance prototype
    // ex: __INTERNAL__ , schedule, scheduled,

    const createClient = () => Spawnkit.Client.from({
      adapters: createAdapters(),
      instances: {
        BadExample,
      },
    });

    expect(createClient).toThrow();

  })

  it("client can use instance methods", async () => {
    const orderbook = client.spawn('OrderBook', 'BTC/EUR');

    const randomNumber = Math.random();
    const order = await orderbook.buy({ tick: 'APPL', qty: randomNumber });
    expect(order).toEqual({
      success: true,
      status: "pending...",
      order: { tick: 'APPL', qty: randomNumber }
    });
  });

  it('client is notified when instance emits event', async () => {
    const orderbook = client.spawn('OrderBook', 'BTC/EUR');

    const hasBeenCalled = new ControlledPromise();
    const ordersStub = jest.fn().mockResolvedValue(true).mockImplementation((args) => hasBeenCalled.resolve(args));

    orderbook.on('orders', ordersStub);
    orderbook.buy({ tick: 'APPL', qty: 10 });

    orderbook.data.on('count', (data) => {

    });

    await hasBeenCalled.await
    await expect(ordersStub).toHaveBeenCalled()
    await expect(ordersStub).toHaveBeenCalledTimes(1);
  })

  it('client resolves even if response is undefined', async () => {
    const emptyInst = client.spawn('EmptyResponseInstance', 'lol');
    const response = await emptyInst.doSomethingAndReturnUndefined();
    expect(response).toBeUndefined();
  })

  it.todo("can call for instance method and not wait for the resonse");
});

describe("Errors", () => {
  it.todo("forwards message, stacktrace and other attributes");
  it.todo("forwards errors thrown during the method call (sync method)");
  it.todo("forwards errors thrown during the method call (async method)");
  it.todo("forwards error if happen during stream ( .map )");
  it.todo("forwards error if happen during stream ( for await )");
});

describe("Data", () => {
  it.todo("can use .data.get() remotely");
  it.todo("can subscribe to data changes via .data.on('key', subscriber)");
});

describe("Stream", () => {
  it.todo("forwards returned stream to client (.map)");
  it.todo("forwards returned stream to client (async iterator)");
  it.todo("should replay messages in the same order they have been emitted");
});

describe("Schedule", () => {
  it.todo("can schedule method call (delay)");
  it.todo("can cancel schedule method call (delay)");
  it.todo("can schedule method call (cron)");
  it.todo("can cancel schedule method call (cron)");
  it.todo("can list all scheduled method call");
});

describe("PubSub", () => {
  it.todo("can emit and listen to instance channels");
  it.todo("when subscrbing to channel, it should not replay past events");
});
