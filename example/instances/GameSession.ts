import * as Spawnkit from "../../src";

interface GameSessionData {
  board: string[][];
}

interface GameSessionEvent {
  action: "move" | "jump";
}

export class GameSession extends Spawnkit.Instance<
  GameSessionData,
  GameSessionEvent
> {
  async stop(): Promise<any> {}

  async start(): Promise<any> {}

  async onEvent(event: GameSessionEvent): Promise<any> {}
}
