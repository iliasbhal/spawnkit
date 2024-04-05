import * as Spawnkit from "@/.";
import wait from "wait";

export class StreamInstance extends Spawnkit.Instance {
  async start(): Promise<any> {
    console.log("AGENT START");
  }
  async stop(): Promise<any> {
    console.log("AGENT STOP");
  }

  startStream() {
    return new Spawnkit.Stream<string>(async (stream) => {
      stream.emit("FIRST");
      console.log("EMITTED FIRST");
      await wait(1000);
      stream.emit("passssamld;");
      console.log("EMITTED passssamld;");
      await wait(1000);
      stream.emit("albacore");
      console.log("EMITTED albacore");
      await wait(1000);
    });
  }
}
