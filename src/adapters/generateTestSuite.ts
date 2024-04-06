import { Adapters } from "./";
import wait from "wait";
import { waitFor } from "poll-until-promise";

export const generateTestSuite = (
  name: string,
  createAdapters: () => () => Promise<Adapters>,
) => {
  describe(name, () => {
    const getAdapters = createAdapters();

    describe("Lock", () => {
      it("can acquire lock only once", async () => {
        const { lock } = await getAdapters();
        const ownerId = crypto.randomUUID();

        expect(await lock.acquire("lock1", ownerId, 1000)).toBe(true);
        expect(await lock.acquire("lock1", ownerId, 1000)).toBe(false);
      });

    });

    describe("PubSub", () => {
      const creatStreamId = createStreamIdGenerator();

      it("should be able to emit and receive events ", async () => {
        const { pubsub } = await getAdapters();

        const streamId = creatStreamId();
        const callback = jest.fn();
        const sub = pubsub.on(streamId, callback);
        await pubsub.emit(streamId, { aaa: true });

        await waitUntilOK(() => {
          expect(callback).toHaveBeenCalled();
          expect(callback).toHaveBeenCalledTimes(1);
          expect(callback).toHaveBeenCalledWith({ aaa: true });
          sub.unsubscribe();
        });
      });

      it("should not receive event on different channels ", async () => {
        const { pubsub } = await getAdapters();

        const streamId = creatStreamId();
        const streamId2 = creatStreamId();
        const callback = jest.fn();
        const sub = pubsub.on(streamId, callback);
        await pubsub.emit(streamId2, { aaa: true });

        await wait(1000);
        expect(callback).not.toHaveBeenCalled();
        sub.unsubscribe();
      });

      it("should trigger the callback on every emitted value", async () => {
        const { pubsub } = await getAdapters();

        const streamId = creatStreamId();
        const callback = jest.fn();
        const sub = pubsub.on(streamId, callback);
        await pubsub.emit(streamId, { test: 1 });
        await wait(10);

        await pubsub.emit(streamId, { test: 2 });
        await pubsub.emit(streamId, { test: 3 });

        await wait(10);

        await pubsub.emit(streamId, { test: 4 });

        await waitUntilOK(() => {
          expect(callback).toHaveBeenCalled();
          expect(callback).toHaveBeenCalledTimes(4);
          expect(callback).toHaveBeenCalledWith({ test: 1 });
          sub.unsubscribe();
        });
      });

      it("should allow for several subscriber to receive events", async () => {
        const { pubsub } = await getAdapters();

        const streamId = creatStreamId();

        const subscribers = Array.from({ length: 16 }).map(() => {
          const callback = jest.fn();
          const subscription = pubsub.on(streamId, callback);
          return {
            callback,
            subscription,
          };
        });

        await pubsub.emit(streamId, { aaa: true });

        await waitUntilOK(() => {
          subscribers.forEach(({ callback, subscription }) => {
            expect(callback).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith({ aaa: true });
            subscription.unsubscribe();
          });
        });
      });
    });
  });
};

function createStreamIdGenerator() {
  let i = 0;
  return () => `stream:${i++}`;
}

async function waitUntilOK(callback: Function) {
  await waitFor(callback, {
    interval: 10,
  });
}
