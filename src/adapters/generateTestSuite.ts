import { Adapters } from "./_common";
import { wait } from "../utils/wait";
import { waitFor } from "poll-until-promise";
import { nanoid } from "nanoid";

export const generateTestSuite = (name: string, createadapter: () => () => Promise<Adapters>) => {
	describe(name, () => {

		const getAdapters = createadapter();

		describe("Lock", () => {
			it("can acquire lock only once", async () => {
				const { lock } = await getAdapters();
				const ownerId = nanoid();

				expect(await lock.acquire("lock1", ownerId, 1000)).toBe(true);
				expect(await lock.acquire("lock1", ownerId, 1000)).toBe(false);
			});

			it("only one process can acquire the lock / async ( gremlin with jitter )", async () => {
				const { lock } = await getAdapters();
				const ownerId = nanoid();

				const results = await Promise.all(
					Array.from({ length: 1000 }).map(async () => {
						const jitter = Math.random() * 1000;
						return wait(jitter).then(() => lock.acquire("lock-concurent", ownerId, 1000));
					}),
				);

				expect(results.filter((acquired) => acquired)).toHaveLength(1);
			});

			it("only one process can acquire the lock / async ( gremlin with no jitter )", async () => {
				const { lock } = await getAdapters();
				const ownerId = nanoid();

				const results = await Promise.all(
					Array.from({ length: 100 }).map(async () => {
						return lock.acquire("lock-concurent-2", ownerId, 1000);
					}),
				);

				expect(results.filter((acquired) => acquired)).toHaveLength(1);
			});

			it("should be able to acquire when it expires", async () => {
				const { lock } = await getAdapters();
				const ownerId = nanoid();

				expect(await lock.acquire("lock2", ownerId, 1000)).toBe(true);
				await wait(1001);
				expect(await lock.acquire("lock2", ownerId, 1000)).toBe(true);
			});

			it("should acquire and release lock", async () => {
				const { lock } = await getAdapters();
				const ownerId = nanoid();

				expect(await lock.acquire("lock3", ownerId, 1000)).toBe(true);
				expect(await lock.release("lock3", ownerId)).toBe(true);
				expect(await lock.acquire("lock3", ownerId, 1000)).toBe(true);
			});

			it("can extend the lock duration", async () => {
				const { lock } = await getAdapters();
				const ownerId = nanoid();

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
				const ownerId = nanoid();

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
				const ownerId = nanoid();

				await lock.acquire("lock5", ownerId, 100);
				await wait(100);
				expect(await lock.extend("lock5", ownerId, 100)).toBe(false);
				expect(await lock.acquire("lock5", ownerId, 100)).toBe(true);
			});

			it("only the process owning the lock can release the lock", async () => {
				const { lock } = await getAdapters();
				const ownerId = nanoid();
				const ownerId2 = nanoid();

				await lock.acquire("lock5", ownerId, 100);
				expect(await lock.release("lock5", ownerId2)).toBe(false);
			});

			it("only the process owning the lock can extend the lock", async () => {
				const { lock } = await getAdapters();
				const ownerId = nanoid();
				const ownerId2 = nanoid();

				await lock.acquire("lock5", ownerId, 100);
				expect(await lock.extend("lock5", ownerId2, 1000)).toBe(false);
			});
		});

		describe("MessageBroker", () => {

			it("should be able to emit and receive events ", async () => {
				const adapters = await getAdapters();

				const config = createStreamConfig();
				const callback = jest.fn();
				const sub = adapters.messages.subscribe(config.instance, config.channel, callback);
				await adapters.messages.publish(config.instance, config.channel, {
					aaa: true,
				});

				await waitUntilOK(() => {
					expect(callback).toHaveBeenCalled();
					expect(callback).toHaveBeenCalledTimes(1);
					expect(callback).toHaveBeenCalledWith(expect.objectContaining({ data: { aaa: true } }));
					sub.unsubscribe();
				});
			});

			it("should not receive event on different channels ", async () => {
				const adapters = await getAdapters();

				const streamId = createStreamConfig();
				const streamId2 = createStreamConfig();
				const callback = jest.fn();
				const sub = adapters.messages.subscribe(streamId.instance, streamId.channel, callback);
				await adapters.messages.publish(streamId2.instance, streamId2.channel, {
					aaa: true,
				});

				await wait(1000);
				expect(callback).not.toHaveBeenCalled();
				sub.unsubscribe();
			});

			it("should trigger the callback on every emitted value once", async () => {
				const adapters = await getAdapters();

				const streamId = createStreamConfig();
				const callback = jest.fn().mockImplementation((...args) => {
					// console.log('callback', args);
				});
				const sub = adapters.messages.subscribe(streamId.instance, streamId.channel, callback);
				await adapters.messages.publish(streamId.instance, streamId.channel, {
					test: 1,
				});
				await wait(10);

				await adapters.messages.publish(streamId.instance, streamId.channel, {
					test: 2,
				});
				await adapters.messages.publish(streamId.instance, streamId.channel, {
					test: 3,
				});

				await wait(10);

				await adapters.messages.publish(streamId.instance, streamId.channel, {
					test: 4,
				});

				await wait(1000);

				expect(callback).toHaveBeenCalled();
				expect(callback).toHaveBeenCalledTimes(4);
				expect(callback).toHaveBeenCalledWith(expect.objectContaining({ data: { test: 1 } }));
				expect(callback).toHaveBeenCalledWith(expect.objectContaining({ data: { test: 2 } }));
				expect(callback).toHaveBeenCalledWith(expect.objectContaining({ data: { test: 3 } }));
				expect(callback).toHaveBeenCalledWith(expect.objectContaining({ data: { test: 4 } }));
				sub.unsubscribe();
			});

			it.only("should emit and receive events in same order", async () => {
				// TODO: test with same client send multiple messages in same timestamp
				// and check if they are received in order
				const adapters = await getAdapters();
				const streamId = createStreamConfig();

				const callback = jest.fn();
				const sub = adapters.messages.subscribe(streamId.instance, streamId.channel, callback);

				for (let i = 0; i < 30; i++) {
					await Promise.all([
						adapters.messages.publish(streamId.instance, streamId.channel, { order: 1 }),
						adapters.messages.publish(streamId.instance, streamId.channel, { order: 2 }),
						adapters.messages.publish(streamId.instance, streamId.channel, { order: 3 }),
					])

					await wait(100);

					const order = callback.mock.calls.map(c => c[0].data.order)
					expect(order).toEqual([1, 2, 3]);
					callback.mockClear();
				}


				sub.unsubscribe()
			});

			it.skip("should emit and receive events in same order from different clients", async () => {
				// TODO: test with different clients sending messages in different timestamp
				// and check if they are received in order
				throw new Error("TODO");
				const adapters = await getAdapters();
				const adapters2 = await getAdapters();
				const streamId = createStreamConfig();

				const callback = jest.fn();
				const sub = adapters.messages.subscribe(streamId.instance, streamId.channel, callback);

				await Promise.all([
					adapters.messages.publish(streamId.instance, streamId.channel, { order: 1 }),
					adapters.messages.publish(streamId.instance, streamId.channel, { order: 2 }),
					adapters2.messages.publish(streamId.instance, streamId.channel, { order: 1 }),
					adapters2.messages.publish(streamId.instance, streamId.channel, { order: 2 }),
					adapters.messages.publish(streamId.instance, streamId.channel, { order: 3 }),
					adapters2.messages.publish(streamId.instance, streamId.channel, { order: 3 }),
				])
			})

			it("should allow for several subscriber to receive events", async () => {
				const adapters = await getAdapters();

				const streamId = createStreamConfig();

				const subscribers = Array.from({ length: 16 }).map(() => {
					const callback = jest.fn();
					const subscription = adapters.messages.subscribe(
						streamId.instance,
						streamId.channel,
						callback,
					);
					return {
						callback,
						subscription,
					};
				});

				await adapters.messages.publish(streamId.instance, streamId.channel, {
					aaa: true,
				});

				await waitUntilOK(() => {
					subscribers.forEach(({ callback, subscription }) => {
						expect(callback).toHaveBeenCalled();
						expect(callback).toHaveBeenCalledTimes(1);
						expect(callback).toHaveBeenCalledWith(expect.objectContaining({ data: { aaa: true } }));
						subscription.unsubscribe();
					});
				});
			});
		});

		describe("Events", () => {
			it.todo('can schedule a delayed event for later without providing an id');
			it.todo('can schedule a delayed event for later with provided id');
			it.todo('can cancel a delayed event');

			it.todo('can schedule a reccuring event for later without provided id');
			it.todo('can schedule a reccuring event for later with provided id');
			it.todo('can cancel a reccuring event');
		})

	});
};

function createStreamConfig(id?: string) {
	const instance = {
		kind: "test",
		id: id ?? nanoid(),
	};

	return {
		instance,
		channel: "rpc",
	} as const
}

export async function waitUntilOK(callback: Function) {
	await waitFor(callback, {
		interval: 10,
		timeout: 10000,
	});
}
