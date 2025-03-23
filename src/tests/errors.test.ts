import * as Spawnkit from "..";
import { testRedisAdapters } from "./_utils";
import { wait } from "../utils/wait";

describe("Errors", () => {
  class ErrorInitExample extends Spawnkit.Instance<{}, {}> {
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

  const client = Spawnkit.Client.from({
    adapters: testRedisAdapters,
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
