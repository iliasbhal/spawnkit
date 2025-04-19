import { ControlledPromise } from './ControlledPromise'

export class ActivityOrder {
  promiseByOrder: ControlledPromise<number>[] = [];

  waitForOrder(order: number) {
    const eventPromise = this.ensureOrderFilled(order);

    Promise.resolve().then(async () => {
      for (let i = order; i < this.promiseByOrder.length; i++) {
        const eventPromise = this.promiseByOrder[i];
        if (!eventPromise) return;

        const isAlreadyFulfilled = eventPromise?.fulfilled;
        if (isAlreadyFulfilled) return;

        const prevEventPromise = this.promiseByOrder[i - 1];
        const isInOrder = i === 0 || prevEventPromise?.fulfilled;
        if (!isInOrder) return;

        eventPromise.resolve(i);
      }
    });

    return eventPromise.await;
  }

  ensureOrderFilled(order: number) {
    const eventPromise = this.promiseByOrder[order];
    if (eventPromise) {
      throw new Error('Order already filled');
    }

    this.promiseByOrder[order] = new ControlledPromise<number>();
    return this.promiseByOrder[order];
  }
}

