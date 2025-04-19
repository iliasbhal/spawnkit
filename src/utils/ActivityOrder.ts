import { ControlledPromise } from './ControlledPromise'

export class ActivityOrder {
  promiseByOrder: ControlledPromise<number>[] = [];

  waitForOrder(order: number) {
    const eventPromise = this.ensureOrderFilled(order);

    Promise.resolve().then(async () => {
      for (let i = order; i < this.promiseByOrder.length; i++) {
        const eventPromise = this.promiseByOrder[i];
        const prevEventPromise = this.promiseByOrder[i - 1];

        const isInOrder = i === 0 || prevEventPromise.fulfilled;
        if (!isInOrder) return;

        eventPromise?.resolve(i);
      }
    });

    return eventPromise.await;
  }

  ensureOrderFilled(order: number) {
    const eventPromise = this.promiseByOrder[order];
    if (eventPromise) return eventPromise;

    for (let i = this.promiseByOrder.length; i <= order; i++) {
      const eventPromise = new ControlledPromise<number>();
      this.promiseByOrder[i] = eventPromise;
    }


    return this.promiseByOrder[order];
  }
}

