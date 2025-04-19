import { ControlledPromise } from './ControlledPromise'

export class ActivityOrder {
  private promiseByOrder: ControlledPromise<number>[] = [];

  waitForOrder(order: number) {
    const eventPromise = this.ensureOrderFilled(order);

    return new Promise((resolve) => {
      eventPromise.await.then(resolve)
      this.fulfillCorrectlyOrdered(order)
    })
  }

  private async fulfillCorrectlyOrdered(fromOrder: number) {
    for (let i = fromOrder; i < this.promiseByOrder.length; i++) {
      const currentPromise = this.promiseByOrder[i];
      if (!currentPromise) return;

      const prevPromise = this.promiseByOrder[i - 1];
      const isInOrder = i === 0 || prevPromise?.fulfilled;
      if (!isInOrder) return;

      currentPromise.resolve(i);
    }
  }

  private ensureOrderFilled(order: number) {
    const eventPromise = this.promiseByOrder[order];
    if (eventPromise) {
      throw new Error('Order already filled');
    }

    this.promiseByOrder[order] = new ControlledPromise<number>();
    return this.promiseByOrder[order];
  }
}

