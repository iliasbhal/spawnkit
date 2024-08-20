import * as Spawnkit from "../src";

interface GameSessionData {
	board: string[][];
}

interface GameSessionEvent {
	round: number;
}

export class GameSession extends Spawnkit.Instance<GameSessionData, GameSessionEvent> {
	async get() {
		const world = await this.data.get("board");
		return world;
	}

	async set(board: GameSessionData["board"]) {
		const response = await await this.data.set("board", board);
		return response;
	}

	move(x: number, y: number) {}
	jump() {}
}
