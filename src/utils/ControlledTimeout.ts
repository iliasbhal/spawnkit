import { ControlledPromise } from "./ControlledPromise";

export class ControlledTimeout {
	promiseCtl = new ControlledPromise();
	get await() {
		return this.promiseCtl.await;
	}

	done() {
		this.promiseCtl.resolve(true);
	}

	running = false;
	remainingTime: number | null = null;
	startedAt: number | null = null;
	timeoutId: ReturnType<typeof setTimeout> | null = null;

	timeout: number | null = null;
	start(remaining: number) {
		this.timeout = remaining;
		const timeRemainig = remaining;
		if (!timeRemainig) {
			throw new Error("Need a Timeout");
		}

		this.timeoutId = setTimeout(() => {
			this.reset();
			this.done();
		}, timeRemainig);

		this.startedAt = Date.now();
		this.running = true;
	}

	stop() {
		if (!this.running) return;

		this.running = false;
		this.remainingTime = Date.now() - this.startedAt!;
		this.startedAt = null;
		clearTimeout(this.timeoutId!);
	}

	resume() {
		if (!this.remainingTime) {
			throw new Error("UH OH");
		}

		this.timeoutId = setTimeout(() => this.done(), this.remainingTime);
		this.startedAt = Date.now();
		this.running = true;
		this.remainingTime = null;
	}

	reset() {
		this.stop();
		this.remainingTime = null;
	}

	restart(timeout?: number) {
		this.reset();

		const nextTimeout = timeout || this.timeout;
		if (!nextTimeout) {
			throw new Error("UH OH");
		}

		this.start(nextTimeout);
	}
}
