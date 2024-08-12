import * as Spawnkit from "../src";
import { wait } from "../src/utils/wait";

export class StreamExample extends Spawnkit.Instance {
  startStream(someData: { count: number }) {
    return new Spawnkit.Stream<string>(async (stream) => {
      for (let i = 0; i < someData.count; i++) {
        stream.emit(`EMMITED VALUE: ${i + 1}/${someData.count}`);
        console.log("EMITTED");
        await wait(1000);
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
          throw new Error("OUPS");
        }
        stream.emit(`EMMITED VALUE: ${i + 1}/4`);
        console.log("EMITTED");
        await wait(1000);
      }
    });
  }
}
