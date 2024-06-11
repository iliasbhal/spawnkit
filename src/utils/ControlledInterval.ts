import { wait } from "./wait";

export class ControlledInterval<V> {
  getValue: () => Promise<V>;
  onChange: (value: V) => void;
  pollInterval: number;
  live = true;
  value: V | undefined = undefined;

  constructor(config: { onChange: any; pollInterval: number; getValue: any }) {
    this.getValue = config.getValue;
    this.pollInterval = config.pollInterval;
    this.onChange = config.onChange;
  }

  static new<V>(config: {
    onChange: (value: V) => void;
    pollInterval: number;
    getValue: () => Promise<V>;
  }) {
    const poll = new ControlledInterval<V>(config);
    poll.subscribe((value) => poll.onChange(value));
    return poll;
  }

  unsubscribe() {
    this.live = false;
  }

  subscribe(onChange: (value: any) => void | Promise<void>) {
    Promise.resolve().then(async () => {
      let loopCount = 0;
      polling: while (this.live) {
        const newValue = await this.getValue();
        if (!this.live) {
          break polling;
        }

        const isFirstLoop = loopCount === 0;
        if (isFirstLoop) {
          this.value = newValue;
          await onChange(newValue);
        } else {
          const newData = JSON.stringify(JSON.parse(JSON.stringify(newValue)));
          const oldData = JSON.stringify(
            JSON.parse(JSON.stringify(this.value)),
          );

          const hasChanged = newData !== oldData;
          if (hasChanged) {
            this.value = newValue;
            await onChange(newValue);
          }
        }

        await wait(this.pollInterval);
        loopCount++;
      }
    });
  }
}
