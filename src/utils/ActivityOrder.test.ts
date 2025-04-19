
import { ActivityOrder } from "./ActivityOrder";

describe("ActivityOrder", () => {

  it('should process messages in order (coming at the same time)', async () => {
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

  it('should process messages in order (coming at different times)', async () => {
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

  it('should process messages in order (coming already orderd)', async () => {
    const orderPipe = new ActivityOrder();
    const messages = [];

    const waitEnsureOrder = async (wait: number, order: number) => {
      await new Promise(resolve => setTimeout(resolve, wait));
      await orderPipe.waitForOrder(order)
      messages.push(order);
    }

    await Promise.all([
      waitEnsureOrder(800, 0),
      waitEnsureOrder(800, 1),
      waitEnsureOrder(1000, 2),
      waitEnsureOrder(1000, 3),
      waitEnsureOrder(1300, 4),
    ]);


    expect(messages).toEqual([0, 1, 2, 3, 4]);
  })

  it('should process messages in order (coming in reverse order)', async () => {
    const orderPipe = new ActivityOrder();
    const messages = [];

    const waitEnsureOrder = async (wait: number, order: number) => {
      await new Promise(resolve => setTimeout(resolve, wait));
      await orderPipe.waitForOrder(order)
      messages.push(order);
    }

    await Promise.all([
      waitEnsureOrder(800, 4),
      waitEnsureOrder(800, 3),
      waitEnsureOrder(1000, 2),
      waitEnsureOrder(1000, 1),
      waitEnsureOrder(1300, 0),
    ]);


    expect(messages).toEqual([0, 1, 2, 3, 4]);
  })

  it('should not count duplicates orders', async () => {
    const orderPipe = new ActivityOrder();
    const messages = [];

    const waitEnsureOrder = async (wait: number, order: number) => {
      await new Promise(resolve => setTimeout(resolve, wait));
      await orderPipe.waitForOrder(order)
      messages.push(order);
    }

    await expect(async () => await Promise.all([
      waitEnsureOrder(800, 3),
      waitEnsureOrder(1000, 1),
      waitEnsureOrder(1200, 2),
      waitEnsureOrder(1400, 0),
      waitEnsureOrder(1600, 3),
    ])).rejects.toThrow('Order already filled');

    expect(messages).toEqual([0, 1, 2, 3]);
  })
});
