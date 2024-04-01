import * as Spawnkit from "@/.";
import wait from "wait";

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
  async start(): Promise<any> {}
  async stop(): Promise<any> {}

  prompt(config: Prompt) {
    return new Spawnkit.Stream<string>(async (stream) => {
      stream.emit("FIRST");
      await wait(1000);
      stream.emit("passssamld;");
      await wait(1000);
      stream.emit("albacore");
      await wait(1000);
      stream.emit(config.prompt);
      await wait(1000);
    });
  }
}
