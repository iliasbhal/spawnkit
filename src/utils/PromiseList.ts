import { ControlledPromise } from "./ControlledPromise";

export class PromiseList extends ControlledPromise<unknown> {
	waitList: Set<Promise<unknown>> = new Set();

	add(promise: Promise<any>) {
		this.waitList.add(promise);
		promise.finally(() => {
			this.waitList.delete(promise);
		});
	}

	addControlled<ResolvedValue>(name?: string) {
		const promiseCtl = ControlledPromise.new<ResolvedValue>(name);
		this.add(promiseCtl.await);
		return promiseCtl;
	}

	addWait(timeout: number, name?: string) {
		const promiseCtl = this.addControlled(name);

		setTimeout(() => { promiseCtl.resolve(true) }, timeout);

		return promiseCtl;
	}

	clear() {
		this.waitList.clear();
		this.resolve(true);
	}

	async waitOnAll() {
		while (true) {
			const previousPromises = Array.from(this.waitList);
			await Promise.allSettled(previousPromises);
			previousPromises.forEach((p) => this.waitList.delete(p));

			const hasNewPromises = this.waitList.size > 0;
			if (!hasNewPromises) {
				break;
			}
		}

		return this.resolve(true);
	}
}
