import * as Spawnkit from "@/.";

interface GameSessionData {
  board: string[][];
}

interface GameSessionEvent {
  round: number;
}

export class GameSession extends Spawnkit.Instance<
  GameSessionData,
  GameSessionEvent
> {
  move(x: number, y: number) {}
  jump() {}
}
