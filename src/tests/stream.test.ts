import * as Spawnkit from "../";
import { wait } from "../utils/wait";
export class StreamExample extends Spawnkit.Instance {
  startStream(someData: { count: number }) {

    return new Spawnkit.Stream<string>(async (stream) => {
      for (let i = 0; i < someData.count; i++) {
        stream.emit(`EMMITED VALUE: ${i + 1}/${someData.count}`);
        // console.log("EMITTED");
        await wait(300);
      }
    });
  }

  startFaultyStreamStart() {
    return new Spawnkit.Stream<string>(async (stream) => {
      throw new Error("OUPS");
    });
  }

  startFaultyStreamDuring() {
    return new Spawnkit.Stream<string>(async (stream) => {
      for (let i = 0; i < 4; i++) {
        if (i === 2) {
          throw new Error(`ERROR DURING STREAM ${i}`);
        }
        stream.emit(`EMMITED VALUE: ${i + 1}/4`);
        // console.log("EMITTED");
        await wait(300);
      }
    });
  }
}

describe("Stream", () => {
  const client = Spawnkit.Client.from({
    adapter: new Spawnkit.Adapters.InMemoryAdapter(),
    instances: {
      StreamExample,
    },
  });

  client.start();

  it("forwards returned stream to client (.map)", async () => {
    const inst = client.spawn("StreamExample", "1");
    const stream = await inst.startStream({ count: 3 });

    const streamResultStub = jest.fn();
    await stream.map((value) => {
      streamResultStub(value);
    });

    expect(streamResultStub).toHaveBeenCalledTimes(3);
    expect(streamResultStub).toHaveBeenNthCalledWith(1, "EMMITED VALUE: 1/3");
    expect(streamResultStub).toHaveBeenNthCalledWith(2, "EMMITED VALUE: 2/3");
    expect(streamResultStub).toHaveBeenNthCalledWith(3, "EMMITED VALUE: 3/3");
  });

  it("forwards returned stream to client (async iterator)", async () => {
    const inst = client.spawn("StreamExample", "1");
    const stream = await inst.startStream({ count: 3 });

    const streamResultStub = jest.fn();
    for await (const value of stream) {
      // console.log("STREAM ->", value);
      streamResultStub(value);
    }

    expect(streamResultStub).toHaveBeenCalledTimes(3);
    expect(streamResultStub).toHaveBeenNthCalledWith(1, "EMMITED VALUE: 1/3");
    expect(streamResultStub).toHaveBeenNthCalledWith(2, "EMMITED VALUE: 2/3");
    expect(streamResultStub).toHaveBeenNthCalledWith(3, "EMMITED VALUE: 3/3");
  });

  it("should replay messages in the same order they have been emitted", async () => {
    const inst = client.spawn("StreamExample", "1");
    const stream = await inst.startStream({ count: 3 });

    const streamResultStub = jest.fn();
    const streamResultStub2 = jest.fn();
    await Promise.all([
      Promise.resolve().then(async () => {
        for await (const value of stream) {
          streamResultStub(value);
        }
      }),
      Promise.resolve().then(async () => {
        for await (const value of stream) {
          streamResultStub2(value);
        }
      }),
    ]);

    expect(streamResultStub).toHaveBeenCalledTimes(3);
    expect(streamResultStub).toHaveBeenNthCalledWith(1, "EMMITED VALUE: 1/3");
    expect(streamResultStub).toHaveBeenNthCalledWith(2, "EMMITED VALUE: 2/3");
    expect(streamResultStub).toHaveBeenNthCalledWith(3, "EMMITED VALUE: 3/3");

    expect(streamResultStub2).toHaveBeenCalledTimes(3);
    expect(streamResultStub2).toHaveBeenNthCalledWith(1, "EMMITED VALUE: 1/3");
    expect(streamResultStub2).toHaveBeenNthCalledWith(2, "EMMITED VALUE: 2/3");
    expect(streamResultStub2).toHaveBeenNthCalledWith(3, "EMMITED VALUE: 3/3");
  });

  it("forwards thrown error to client (.map)", async () => {
    const inst = client.spawn("StreamExample", "1");
    const stream = await inst.startFaultyStreamStart();

    const streamResultStub = jest.fn();

    await expect(() => stream.map((value) => { streamResultStub(value) })).rejects.toThrow("OUPS");

    expect(streamResultStub).toHaveBeenCalledTimes(0);
  });

  it("forwards thrown error to client (async iterator)", async () => {
    const inst = client.spawn("StreamExample", "2");
    const stream = await inst.startFaultyStreamStart();

    const streamResultStub = jest.fn();

    await expect(() => Promise.resolve().then(async () => {
      await stream.map((value) => {
        streamResultStub(value);
      });
      // for await (const value of stream) {
      //   streamResultStub(value);
      // }
    })).rejects.toThrow("OUPS");

    expect(streamResultStub).toHaveBeenCalledTimes(0);
  })

  it.todo('forwards error message, stacktrace and other attributes');


  it('forward error when stream errors in middle of stream', async () => {
    const inst = client.spawn("StreamExample", "1");
    const stream = await inst.startFaultyStreamDuring();

    const streamResultStub = jest.fn();

    await expect(() => stream.map((value) => { streamResultStub(value) }))
      .rejects.toThrow("ERROR DURING STREAM 2");

  });
});