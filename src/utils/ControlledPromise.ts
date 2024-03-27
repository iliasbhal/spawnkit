enum PROMISE_STATE {
  PENDING,
  RESOLVED,
  REJECTED,
}

export class ControlledPromise<T> {
  start = Date.now();
  name: string | undefined = undefined;
  get elasped(): number {
    return Date.now() - this.start;
  }

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

    this.state = PROMISE_STATE.RESOLVED; // update internal state immediately
    this.value = value;
    this._resolve(value);
  }

  error: Error | undefined = undefined;
  _reject: (value: typeof this.error) => void = (err) => {};
  reject(err: Error) {
    if (this.value || this.error) return;
    if (this.state !== PROMISE_STATE.PENDING) return;

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

  static new(name?: string) {
    const promiseCtl = new ControlledPromise(name);
    return promiseCtl;
  }
}
