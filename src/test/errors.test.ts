import "dotenv/config";

import { redis } from "../adapters/redis/client";

import * as Spawnkit from "..";
import * as RedisAdapter from "../adapters/redis";
import {
  OrderBook,
  EmptyResponseInstance,
  BadExample,
  IntrospectExample,
} from "./index.test.fixtures";
import { ControlledPromise } from "../utils/ControlledPromise";
import { wait } from "../utils/wait";

export const AAA = {}

describe("Errors", () => {
  class ErrorInitExample extends Spawnkit.Instance<{}, {}, {}> {
    async initialize() {
      await wait(1000);
      throw new Error("BAD BAD");
    }

    on(event, callback) {
      console.log('EVENT', event)
    }

    async dispose() {
      console.log('DISPOSE STARTED')
      await wait(1000);
      console.log('WHILE ---- DISPOSE ErrorInitExample')
      // throw new Error("BAD BAD DISPOSE");
    }

    doSomething(msg: string) {
      return true;
    }
  }

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
      ErrorInitExample,
    },
  });

  client.start();

  it('client calls should fail when instance fails to initialize', async () => {
    const instance = client.spawn('ErrorInitExample', '1');

    await Promise.all([
      expect(() => instance.doSomething('hello')).rejects.toThrow('Instance failed to initialize'),
      expect(() => instance.doSomething('hello')).rejects.toThrow('Instance failed to initialize'),
    ])
  })

  it('notify client when instance fails to initialize', async () => {
    const instance = client.spawn('ErrorInitExample', '2');
    const onInstanceError = jest.fn()

    instance.utils.on('error', () => onInstanceError())

    try {
      await instance.doSomething('hello')
    } catch (error) { }

    expect(onInstanceError).toHaveBeenCalled();

  })

  it.todo('notify client when instance fails to dispose')
  it.todo('should only dispose if it successfully initialized')


});
