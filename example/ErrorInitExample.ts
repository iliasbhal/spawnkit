import * as Spawnkit from "../src";
import { wait } from "../src/utils/wait";

export class ErrorInitExample extends Spawnkit.Instance {
	async initialize() {
		console.log('INIT ErrorInitExample')
		await wait(1000);
		console.log('INIT FAILED')
		throw new Error("BAD BAD");
	}

	async dispose() {
		await wait(3000);
		console.log('WHILE ---- DISPOSE ErrorInitExample')
		// throw new Error("BAD BAD DISPOSE");
	}
	doSomething(msg: string) {
		return true;
	}
}
