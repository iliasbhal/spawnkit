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

      it("only one process can acquire the lock / async ( gremlin with jitter )", async () => {
        const { lock } = await getAdapters();
        const ownerId = crypto.randomUUID();

        const results = await Promise.all(
          Array.from({ length: 100 }).map(async () => {
            const jitter = Math.random() * 1000;
            return wait(jitter).then(() =>
              lock.acquire("lock-concurent", ownerId, 1000),
            );
          }),
        );

        expect(results.filter((acquired) => acquired)).toHaveLength(1);
      });

      it("only one process can acquire the lock / async ( gremlin with no jitter )", async () => {
        const { lock } = await getAdapters();
        const ownerId = crypto.randomUUID();

        const results = await Promise.all(
          Array.from({ length: 100 }).map(async () => {
            return lock.acquire("lock-concurent-2", ownerId, 1000);
          }),
        );

        expect(results.filter((acquired) => acquired)).toHaveLength(1);
      });

      it("should be able to acquire when it expires", async () => {
        const { lock } = await getAdapters();
        const ownerId = crypto.randomUUID();

        expect(await lock.acquire("lock2", ownerId, 1000)).toBe(true);
        await wait(1000);
        expect(await lock.acquire("lock2", ownerId, 1000)).toBe(true);
      });

      it("should acquire and release lock", async () => {
        const { lock } = await getAdapters();
        const ownerId = crypto.randomUUID();

        expect(await lock.acquire("lock3", ownerId, 1000)).toBe(true);
        expect(await lock.release("lock3", ownerId)).toBe(true);
        expect(await lock.acquire("lock3", ownerId, 1000)).toBe(true);
      });

      it("can extend the lock duration", async () => {
        const { lock } = await getAdapters();
        const ownerId = crypto.randomUUID();

        await lock.acquire("lock4", ownerId, 100);
        await wait(50);

        expect(await lock.acquire("lock4", ownerId, 100)).toBe(false);
        await lock.extend("lock4", ownerId, 100);

        await wait(50);
        expect(await lock.acquire("lock4", ownerId, 100)).toBe(false);

        await wait(50);
        expect(await lock.acquire("lock4", ownerId, 100)).toBe(true);
      });

      it("can extend lock to several the initial lock duration", async () => {
        const { lock } = await getAdapters();
        const ownerId = crypto.randomUUID();

        await lock.acquire("lock4-2", ownerId, 300);
        await wait(150);
        await lock.extend("lock4-2", ownerId, 300);
        await wait(150);
        await lock.extend("lock4-2", ownerId, 300);
        await wait(150);
        await lock.extend("lock4-2", ownerId, 300);
        await wait(150);
        await lock.extend("lock4-2", ownerId, 300);
        await wait(150);

        expect(await lock.acquire("lock4-2", ownerId, 300)).toBe(false);

        await wait(300);
        expect(await lock.acquire("lock4-2", ownerId, 300)).toBe(true);
      });

      it("cannot extend lock duration is already expired", async () => {
        const { lock } = await getAdapters();
        const ownerId = crypto.randomUUID();

        await lock.acquire("lock5", ownerId, 100);
        await wait(100);
        expect(await lock.extend("lock5", ownerId, 100)).toBe(false);
        expect(await lock.acquire("lock5", ownerId, 100)).toBe(true);
      });

      it("only the process owning the lock can release the lock", async () => {
        const { lock } = await getAdapters();
        const ownerId = crypto.randomUUID();
        const ownerId2 = crypto.randomUUID();

        await lock.acquire("lock5", ownerId, 100);
        expect(await lock.release("lock5", ownerId2)).toBe(false);
      });

      it("only the process owning the lock can extend the lock", async () => {
        const { lock } = await getAdapters();
        const ownerId = crypto.randomUUID();
        const ownerId2 = crypto.randomUUID();

        await lock.acquire("lock5", ownerId, 100);
        expect(await lock.extend("lock5", ownerId2, 1000)).toBe(false);
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
