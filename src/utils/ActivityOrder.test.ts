
import { ActivityOrder } from "./ActivityOrder";

describe("ActivityOrder", () => {

  it('internal: should process messages in order (coming at the same time)', async () => {
    const orderPipe = new ActivityOrder();
    const messages = [];

    const ensureOrder = async (order: number) => {
      await orderPipe.waitForOrder(order)
      messages.push(order);
    }

    await Promise.all([
      ensureOrder(3),
      ensureOrder(1),
      ensureOrder(2),
      ensureOrder(0),
    ]);


    expect(messages).toEqual([0, 1, 2, 3]);
  })

  it('internal: should process messages in order (coming at different times)', async () => {
    const orderPipe = new ActivityOrder();
    const messages = [];

    const waitEnsureOrder = async (wait: number, order: number) => {
      await new Promise(resolve => setTimeout(resolve, wait));
      await orderPipe.waitForOrder(order)
      messages.push(order);
    }

    await Promise.all([
      waitEnsureOrder(800, 3),
      waitEnsureOrder(1000, 1),
      waitEnsureOrder(1200, 2),
      waitEnsureOrder(1400, 0),
    ]);


    expect(messages).toEqual([0, 1, 2, 3]);
  })
});
