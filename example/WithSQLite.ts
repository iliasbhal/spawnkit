import * as Spawnkit from "../src";
import { wait } from "../src/utils/wait";

interface AgentAIData {
  // messages: string[];
}

interface AgenAIChannels { }

interface Prompt {
  taskId: string;
  prompt: string;
  model: "claude3" | "gemini" | "openai";
}

export class WithSQLite extends Spawnkit.Instance<AgentAIData, AgenAIChannels> {
  sql = new Spawnkit.Plugins.SQLite();

  on(channel: any, message: any): void {

  }

  getTaskById(taskId: string) {
    return this.sql.query`
      SELECT * FROM tasks WHERE id = ${taskId}
    `;
  }
}
