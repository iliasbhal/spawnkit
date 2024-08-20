enum PROMISE_STATE {
	PENDING,
	RESOLVED,
	REJECTED,
}

export class ControlledPromise<T> {
	startedAt = Date.now();
	fulfilledAt: null | number = null;
	get elasped(): number {
		if (this.fulfilledAt) {
			return this.fulfilledAt - this.startedAt;
		}

		return Date.now() - this.startedAt;
	}

	name: string | undefined = undefined;

	promise!: Promise<T>;
	get await() {
		return this.promise;
	}

	state = PROMISE_STATE.PENDING;
	get pending() {
		return this.state === PROMISE_STATE.PENDING;
	}
	get resolved() {
		return this.state === PROMISE_STATE.RESOLVED;
	}
	get rejected() {
		return this.state === PROMISE_STATE.REJECTED;
	}

	get fulfilled() {
		return this.rejected || this.resolved;
	}

	value: T | undefined = undefined;
	_resolve: (value: T) => void = (value: T) => {};
	resolve(value: T) {
		if (this.value || this.error) return;
		if (this.state !== PROMISE_STATE.PENDING) return;

		this.fulfilledAt = Date.now();
		this.state = PROMISE_STATE.RESOLVED; // update internal state immediately
		this.value = value;
		this._resolve(value);
	}

	error: Error | undefined = undefined;
	_reject: (value: typeof this.error) => void = (err) => {};
	reject(err: Error) {
		if (this.value || this.error) return;
		if (this.state !== PROMISE_STATE.PENDING) return;

		this.fulfilledAt = Date.now();
		this.state = PROMISE_STATE.REJECTED; // update internal state immediately
		this.error = err;
		this._reject(err);
	}

	constructor(name?: string) {
		this.name = name;
		this.state = PROMISE_STATE.PENDING;
		this.promise = new Promise<T>((_resolve, _reject) => {
			this._resolve = _resolve;
			this._reject = _reject;
		});

		Object.assign(this.promise, { name: this.name });
	}

	static new<ResolvedValue>(name?: string) {
		const promiseCtl = new ControlledPromise<ResolvedValue>(name);
		return promiseCtl;
	}

	static wrapSignal(abortsignal: AbortSignal) {
		const promiseCtl = new ControlledPromise();
		const throwErr = (e: any) => promiseCtl.reject(e.target.reason);
		abortsignal.addEventListener("abort", throwErr);

		return promiseCtl.await.finally(() => {
			abortsignal.removeEventListener("abort", throwErr);
		});
	}
}
