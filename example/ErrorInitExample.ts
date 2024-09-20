import * as Spawnkit from "../src";
import { wait } from "../src/utils/wait";

export class ErrorInitExample extends Spawnkit.Instance {
	async initialize() {
		console.log('INIT ErrorInitExample')
		await wait(4000);
		throw new Error("BAD BAD");
	}
	doSomething(msg: string) {
		return true;
	}
}
