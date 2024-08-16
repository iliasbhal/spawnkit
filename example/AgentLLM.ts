import * as Spawnkit from "../src";
import { wait } from "../src/utils/wait";

interface AgentAIData {
  messages: string[];
}

interface AgenAIChannels {}

interface Prompt {
  taskId: string;
  prompt: string;
  model: "claude3" | "gemini" | "openai";
}

export class AgentLLM extends Spawnkit.Instance<AgentAIData, AgenAIChannels> {
  on(channel: any, message: any): void {}

  prompt(config: Prompt) {
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
      stream.emit(config.prompt);
      console.log("EMITTED ", config.prompt);
      await wait(1000);
    });
  }
}
