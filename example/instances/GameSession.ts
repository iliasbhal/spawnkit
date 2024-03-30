import * as Spawnkit from "@/.";

interface GameSessionData {
  board: string[][];
}

interface EventBus {
  round: number;
}

export class GameSession extends Spawnkit.Instance<GameSessionData, EventBus> {
  async start(): Promise<any> {}
  async stop(): Promise<any> {}

  move(x: number, y: number) {}
  jump() {}
}
