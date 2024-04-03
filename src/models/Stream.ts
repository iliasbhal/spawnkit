import { ControlledPromise } from "@/utils/ControlledPromise";

type StreamBuilder<StreamValue> = (stream: Stream<StreamValue>) => any;

interface CallbackByEvent<StreamValue> {
  start: () => any;
  data: (data: StreamValue) => any;
  end: () => any;
  error: (err: Error) => any;
}

export class Stream<StreamValue> {
  abortCtl = new AbortController();
  callback: StreamBuilder<StreamValue>;

  constructor(callback: StreamBuilder<StreamValue>) {
    this.callback = callback;
  }

  eventsHandlers = new Map<
    keyof CallbackByEvent<StreamValue>,
    Set<CallbackByEvent<StreamValue>[keyof CallbackByEvent<StreamValue>]>
  >();
  on<EV extends keyof CallbackByEvent<any>>(
    event: EV,
    callback: CallbackByEvent<StreamValue>[EV],
  ) {
    if (!this.eventsHandlers.has(event)) {
      this.eventsHandlers.set(event, new Set());
    }

    this.eventsHandlers.get(event)!.add(callback);
  }

  storred: any[] = [];
  store(event: any, data?: any) {
    if (this.started) {
      this.unstore();
      this.notify(event, data);
      return;
    }

    this.storred.push({ event, data });
  }

  unstore() {
    if (this.storred.length) {
      this.storred.splice(0).forEach(({ event, data }) => {
        this.notify(event, data);
      });
    }
  }

  async map(callback: (data: StreamValue) => any) {
    if (this.closed) return;

    return await new Promise((resolve, reject) => {
      this.on("end", () => resolve(true));
      this.on("error", (err) => reject(err));
      this.on("data", (data) => callback(data));

      this.unstore();
    });
  }

  createIterator() {
    const stream = this;

    return async function* () {
      if (stream.closed) return;

      const incomingData: StreamValue[] = [];
      let promiseCtl = new ControlledPromise();

      stream.on("error", (err) => {
        promiseCtl.reject(err);
      });

      stream.on("data", (data) => {
        incomingData.push(data);

        // Reset Promise
        promiseCtl.resolve(true);
        promiseCtl = new ControlledPromise();
      });

      stream.on("end", () => {
        promiseCtl.resolve(true);
      });

      Promise.resolve().then(() => {
        stream.unstore();
      });

      while (!stream.closed) {
        await promiseCtl.await;
        const dataToYield = incomingData.splice(0);
        yield* dataToYield;
      }
    };
  }

  [Symbol.asyncIterator] = this.createIterator();

  notify<EV extends keyof CallbackByEvent<StreamValue>>(
    event: EV,
    data?: Parameters<CallbackByEvent<StreamValue>[EV]>[0] extends never
      ? never
      : Parameters<CallbackByEvent<StreamValue>[EV]>[0],
  ) {
    if (this.closed) return;
    if (event === "end") this.closed = true;
    if (event === "start") this.started = true;

    this.eventsHandlers.get(event)?.forEach((callback) => {
      // @ts-ignore
      callback(data);
    });
  }

  clear() {
    this.eventsHandlers.clear();
  }

  started = false;
  async start() {
    try {
      this.notify("start");
      await this.callback(this);
    } catch (err) {
      if (err instanceof Error) {
        this.error(err);
      }
    } finally {
      this.close();
    }
  }

  emit(data: StreamValue) {
    this.store("data", data);
  }

  push(data: StreamValue) {
    this.store("data", data);
  }

  error(err: Error) {
    this.store("error", err);
    this.store("end");
  }

  closed: boolean = false;
  close() {
    this.store("end");
  }
}
