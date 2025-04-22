import { ControlledPromise } from './ControlledPromise'
import { MapExpire } from './MapExpire';

export class ActivityOrder {
  private promiseByOrder: ControlledPromise<number>[] = [];

  waitForOrder(order: number) {
    const eventPromise = this.ensureOrderFilled(order);

    return new Promise((resolve) => {
      eventPromise.await.then(resolve);
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

  static activityOrderByOriginAndTimestamp = new MapExpire<string, ActivityOrder>({ defaultExpiryMs: 5000 })
  static getOrCreateActivityOrder(origin: string, timestamp: number) {
    const eventKey = `${origin}:${timestamp}`;

    const alreadyExisting = ActivityOrder.activityOrderByOriginAndTimestamp.get(eventKey);
    if (alreadyExisting) {
      return alreadyExisting;
    }

    const orderData = new ActivityOrder();
    ActivityOrder.activityOrderByOriginAndTimestamp.set(eventKey, orderData);
    return orderData;
  }
}

export class ActivityOrderFactory {
  private accumulator = {
    timestamp: Date.now(),
    order: 0,
  };

  getOrderedMetadata = (): { timestamp: number; order: number } => {
    const timestamp = Date.now();

    const timestampChanged = this.accumulator.timestamp !== timestamp;
    if (timestampChanged) {
      this.accumulator = {
        timestamp,
        order: 0,
      };
    } else {
      this.accumulator.order++;
    }

    return {
      ...this.accumulator,
    };
  }
}


