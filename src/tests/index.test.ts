import * as Spawnkit from "..";

import {
	OrderBook,
	EmptyResponseInstance,
	BadExample,
	IntrospectExample,
} from "./_fixtures";
import { ControlledPromise } from "../utils/ControlledPromise";

import { nanoid } from "nanoid";

describe.only("Base", () => {
	const client = Spawnkit.Client.from({
		adapter: new Spawnkit.Adapters.InMemoryAdapter(),
		instances: {
			BadExample,
			OrderBook,
			EmptyResponseInstance,
			IntrospectExample,
		},
	});

	client.start();

	it("should not allow usage of reserved keywords", async () => {
		// RESERVED KEYWORDS are the properties that are used internally by the client
		// And that are not part of the instance prototype
		// ex: __INTERNAL__ , schedule, scheduled,

		const bad = client.spawn("BadExample", "lol");
		await bad.remote.getLatency()
	});

	it("client can use instance methods", async () => {
		const orderbook = client.spawn("OrderBook", "BTC/EUR");

		const randomNumber = Math.random();
		const order = await orderbook.buy({ tick: "APPL", qty: randomNumber });
		expect(order).toEqual({
			success: true,
			status: "pending...",
			order: { tick: "APPL", qty: randomNumber },
		});
	});

	it("client is notified when instance emits event", async () => {
		const orderbook = client.spawn("OrderBook", "BTC/EUR");

		const hasBeenCalled = new ControlledPromise();
		const ordersStub = jest
			.fn()
			.mockResolvedValue(true)
			.mockImplementation((args) => hasBeenCalled.resolve(args));

		orderbook.on("orders", ordersStub);
		orderbook.buy({ tick: "APPL", qty: 10 });

		await hasBeenCalled.await;
		await expect(ordersStub).toHaveBeenCalled();
		await expect(ordersStub).toHaveBeenCalledTimes(1);
	});

	it("client resolves even if response is undefined", async () => {
		const emptyInst = client.spawn("EmptyResponseInstance", "lol1");
		const response = await emptyInst.doSomethingAndReturnUndefined();
		expect(response).toBeUndefined();
	});

	it("instances can know which id they are", async () => {
		const exampleInst = client.spawn("IntrospectExample", "intro-123123132");

		const info = await exampleInst.getInfo();
		expect(info).toEqual({
			id: "intro-123123132",
			kind: "IntrospectExample",
		});
	});


	it('can access spawn context within instance', async () => {
		const userId = nanoid();
		const exampleInst = client.spawn("IntrospectExample", "intro-12312300", {
			userID: userId,
		});

		const response = await exampleInst.getUserId();
		expect(response).toEqual(userId);
	})

	it('can access correct spawn context within instance', async () => {
		const exampleInst1 = client.spawn("IntrospectExample", "intro-12312300", { userID: nanoid() });
		const exampleInst2 = client.spawn("IntrospectExample", "intro-12312300", { userID: nanoid() });
		const exampleInst3 = client.spawn("IntrospectExample", "intro-12312300", { userID: nanoid() });

		const resolveOrder = [];
		const createTrackerForInst = (id: string) => (userId) => {
			resolveOrder.push(id);
			return userId;
		}

		const [userId1, userId2, userId3] = await Promise.all([
			exampleInst1.getUserIdWithWaiting(1000).then(createTrackerForInst('1')),
			exampleInst2.getUserIdWithWaiting(0).then(createTrackerForInst('2')),
			exampleInst3.getUserIdWithWaiting(300).then(createTrackerForInst('3')),
		])

		expect(resolveOrder).toEqual(['2', '3', '1']);
		expect(userId1).toEqual(exampleInst1.context.userID);
		expect(userId2).toEqual(exampleInst2.context.userID);
		expect(userId3).toEqual(exampleInst3.context.userID);
	})

	it.todo("forwards error message, stacktrace and other attributes");
	it.todo("forwards errors thrown during the method call (sync method)");
	it.todo("forwards errors thrown during the method call (async method)");
});
