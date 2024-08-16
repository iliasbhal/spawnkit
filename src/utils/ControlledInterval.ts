import { ControlledPromise } from "./ControlledPromise";
import { wait } from "./wait";

interface ControlledIntervalConfig {
  interval: number;
  execute: (count: number) => unknown;
}

export class ControlledInterval {
  interval: number;
  execute: (count: number) => unknown;
  promiseCtl = new ControlledPromise<boolean>();

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
    this.live = false;
    this.promiseCtl.resolve(true);
  }

  get await() {
    return this.promiseCtl.await;
  }

  stop() {
    this.live = false;
  }

  start() {
    this.live = true;
    Promise.resolve().then(async () => {
      let loopCount = 0;
      polling: while (this.live) {
        if (!this.live) {
          break polling;
        }

        const response = this.execute(loopCount);
        if (response instanceof Promise) {
          await response.catch((error) => {
            this.promiseCtl.reject(error);
            this.dispose();
          });
        }

        await wait(this.interval);
        loopCount++;
      }
    });
  }
}
