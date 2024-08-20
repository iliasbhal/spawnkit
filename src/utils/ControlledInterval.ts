import { ControlledPromise } from "./ControlledPromise";
import { wait } from "./wait";

interface ControlledIntervalConfig {
	interval: number;
	execute: (count: number) => unknown;
}

export class ControlledInterval {
	interval: number;
	execute: (count: number) => unknown;
	promiseCtl = new ControlledPromise<number>();

	constructor(config: ControlledIntervalConfig) {
		this.interval = config.interval;
		this.execute = config.execute;
	}

	static new(config: ControlledIntervalConfig) {
		const poll = new ControlledInterval(config);
		poll.start();
		return poll;
	}

	live: boolean = false;
	dispose() {
		this.stop();
		this.resolve();
	}

	private resolve() {
		this.promiseCtl.resolve(this.count);
	}

	private reject(error: Error) {
		this.promiseCtl.reject(error);
	}

	get await() {
		return this.promiseCtl.await;
	}

	stop() {
		this.live = false;
	}

	count = 0;
	start() {
		this.live = true;
		Promise.resolve().then(async () => {
			this.count = 0;
			polling: while (this.live) {
				if (!this.live) {
					break polling;
				}

				const response = this.execute(this.count);
				if (response instanceof Promise) {
					await response.catch((error) => {
						this.reject(error);
						this.dispose();
					});
				}

				await wait(this.interval);
				this.count++;
			}
		});
	}
}
