import "dotenv/config";

import { wait } from "../src/utils/wait";
import * as Spawnkit from "@/.";
import * as RedisAdapter from "@/adapters/redis";
import { redis } from "@/adapters/redis/client";
import * as instances from "../example/_index";
import { ControlledInterval } from "@/utils/ControlledInterval";
import { ControlledPromise } from "@/utils/ControlledPromise";

const createAdapters = () => ({
	lock: new RedisAdapter.Lock(redis),
	data: new RedisAdapter.Data(redis),
	messages: new RedisAdapter.MessageBroker(redis),
	events: new RedisAdapter.EventScheduler(redis),
	instances: new RedisAdapter.InstanceScheduler(redis),
	logger: new RedisAdapter.Logger(redis),
});

const client = Spawnkit.Client.from({
	adapters: createAdapters(),
	instances: instances,
});

client.start();

const main = async () => {
	const orderBook = client.spawn("OrderBook", "BTC/EUR");
	const waitForAllProcessed: Record<string, ControlledPromise<any>> = {};

	const subscription1 = orderBook.on("orders", (event) => {
		const [count, i] = event;
		waitForAllProcessed[`${count}-${i}`]?.resolve?.(null);
		// console.log("ON CLIENT 1", event);
	});

	// const subscription2 = orderBook.on("orders", (event) => {
	//   console.log("ON CLIENT 2", event);
	// });

	const tick = Math.random() > 0.5 ? "GOOG" : "APPL";

	const timeSpentCalling: number[] = [];

	const promiseList: Promise<any>[] = [];

	const interval = ControlledInterval.new({
		interval: 14,
		execute: async (count) => {
			// console.log("COUNT", count);
			if (count >= 100) {
				interval.dispose();
				return;
			}

			promiseList.push(
				Promise.all(
					Array.from({ length: 200 }).map(async (_, i) => {
						await wait(i);
						const timerKey = `${count}-${i}`;
						if (!waitForAllProcessed[timerKey]) {
							waitForAllProcessed[timerKey] = ControlledPromise.new<any>();
						}

						const begin = Date.now();

						// await orderBook.emit("buyOrders", [count, i]);
						// await orderBook.emit("buyOrders", [count, i]);

						await orderBook.buy({
							tick: `${count}`,
							qty: i,
						});

						const end = Date.now();
						timeSpentCalling.push(end - begin);
					}),
				),
			);
		},
	});

	const count = await interval.await;

	await Promise.all(promiseList);

	console.log("WAITING FOR ALL PROCESSED");
	await Promise.all(Object.values(waitForAllProcessed).map((p) => p.await));

	console.log("ALL PROCESSED");

	const timeSpentComputing =
		Object.values(waitForAllProcessed)
			.map((p) => p.elasped)
			.reduce((acc, curr) => acc + curr, 0) / Object.values(waitForAllProcessed).length;

	console.log(
		"TIME SPENT CALLING",
		timeSpentCalling.reduce((acc, curr) => acc + curr, 0) / timeSpentCalling.length,
	);
	console.log("TIME SPENT COMPUTING", timeSpentComputing);
	console.log("COUNT", count);

	subscription1.unsubscribe();
	// subscription2.unsubscribe();
};

const startTime = Date.now();
console.log("START");
console.profile();
main()
	.then((result) => console.log("DONE"))
	.catch((err) => console.error("ERR", err))
	.finally(() => {
		const timeSpent = Date.now() - startTime;
		console.log(timeSpent, "ms");
		console.profileEnd();
	});
