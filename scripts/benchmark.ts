import "dotenv/config";

import * as Spawnkit from "../";
import * as RedisAdapter from "../src/adapters/redis";
import { redis } from "../src/adapters/redis/client";
import { ControlledInterval } from "../src/utils/ControlledInterval";
import { ControlledPromise } from "../src/utils/ControlledPromise";
import { wait } from "../src/utils/wait";

interface OrderBookContext {
	userID: string;
}

interface OrderBookData {
	orderBook: string[];
	count: number;
}

interface OrderBookEvent {
	buyOrders: any[];
	orders: [string, number];
	alphachannel: string;
}

interface Stock {
	tick: string;
}

interface Order extends Pick<Stock, "tick"> {
	qty: number;
}

export class OrderBook extends Spawnkit.Instance<OrderBookContext, OrderBookEvent> {
	on<C extends keyof OrderBookEvent>(channel: C, message: OrderBookEvent[C]) {
		if (channel === "buyOrders") {
			const mdg = message;
			this.emit("orders", mdg as any);
			return;
		}
		// console.log("ON INSTANCE", this.id, channel, message);
	}

	async buy(order: Order) {
		// this.logger.log("-----BUYYYYY------");
		// console.log("___BUY___", order);
		// this.data = this.data || ({} as any);
		// this.data!.count = this.data?.count || 0;
		// this.data!.count++;

		// const interval = setInterval(() => {
		this.emit("orders", [order.tick, order.qty]);
		// })
		// setTimeout(() => {
		//   clearInterval(interval);
		// }, 400);

		return {
			success: true,
			status: "pending...",
			order,
		};
	}

	async multiple(...stocks: Stock[]) {
		return stocks.length;
	}

	async sell(stock: Stock): Promise<true> {
		return true;
	}
}

const client = Spawnkit.Client.from({
	adapters: {
		lock: new RedisAdapter.Lock(redis),
		data: new RedisAdapter.Data(redis),
		messages: new RedisAdapter.MessageBroker(redis),
		events: new RedisAdapter.EventScheduler(redis),
		instances: new RedisAdapter.InstanceScheduler(redis),
		logger: new RedisAdapter.Logger(redis),
	},
	instances: {
		OrderBook,
	},
	config: {

	}
});


redis.flushall('SYNC');
client.start();


export const main = async () => {
	const orderBook = client.spawn("OrderBook", "BTC/EUR", {
		userID: 'ALHA',
	});

	orderBook.utils.ensureLive()

	const waitForAllProcessed: Record<string, ControlledPromise<any>> = {};

	let incomingEvents = 0;
	const subscription1 = orderBook.on("orders", (event) => {
		incomingEvents++
		const [count, i] = event;
		waitForAllProcessed[`${count}-${i}`]?.resolve?.(null);
	});

	// const subscription2 = orderBook.on("orders", (event) => {
	//   console.log("ON CLIENT 2", event);
	// });

	const tick = Math.random() > 0.5 ? "GOOG" : "APPL";

	const timeSpentCalling: number[] = [];

	const promiseList: Promise<any>[] = [];

	const interval = ControlledInterval.new({
		interval: 6,
		execute: async (count) => {
			console.log("COUNT", count);
			if (count >= 10) {
				interval.dispose();
				return;
			}

			promiseList.push(
				Promise.all(
					Array.from({ length: 10 }).map(async (_, i) => {
						// await wait(i);
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
	console.log("INCOMING EVENTS", incomingEvents);

	subscription1.unsubscribe();
	// subscription2.unsubscribe();
};
