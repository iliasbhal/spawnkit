import { wait } from "./wait";

export class AsyncDebounceHandler {
  private lastKey: any = null;
  public async onlyLastOnePerTick(callback: Function) {
    this.lastKey = {};
    const key = this.lastKey;

    await wait(0).then(async () => {
      if (this.lastKey !== key) {
        return;
      }

      await callback();
    });
  }
}
