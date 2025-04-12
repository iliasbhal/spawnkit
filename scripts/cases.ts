import "dotenv/config";

import { wait } from "../src/utils/wait";

import * as instances from "../example/_index";
import { nanoid } from "nanoid";
import { Logger } from "../src/core/Logger";
import { Lock } from "../src/core/Lock";


import * as Spawnkit from "..";

import { ControlledInterval } from "../src/utils/ControlledInterval";
import { ControlledPromise } from "../src/utils/ControlledPromise";


const client = Spawnkit.Client.from({
	adapter: new Spawnkit.Adapters.InMemoryAdapter(),
	instances: instances,
	config: {

	}
});

export const main = async () => {
	// await redis.flushall("SYNC");
	await client.start();

	// client.on('stalled', (err) => {

	// })

	//   // attributeExample();
	await Promise.all([
		withPlugin(),
		// errorOnLifeCycle(),
		// severalClients(),
		// basicExample(),
		// performanceBenchmanrk(),
		// performanceBenchmanrk(),
		// performanceBenchmanrk(),
		// errorHandlingExample(),
		// streamExample(),
		// streamWithErrors(),
		// scheduleCallExample(),
		// emittedEventsExample(),
		// exampleXState(),
		// exampleData(),
		// exampleBadCall(),
	]);
};

const attributeExample = () => {
	const exampleInst = client.spawn("StreamExample", "Hector", {

	});
	console.log(exampleInst.kind, exampleInst.id);
};

// class OrderBuuk {
//   static withId(sss: stirng) {}
// }

// const orderBook = OrderBuuk.spawn("BTC/EUR");

const basicExample = async () => {
	const orderBook = client.spawn("OrderBook", "BTC/EUR", {
		userID: "Henry",
	});
	const subscription1 = orderBook.on("orders", (event) => {
		// console.log("ON CLIENT 1", event);
	});

	const subscription2 = orderBook.on("orders", (event) => {
		// console.log("ON CLIENT 2", event);
	});

	// Example 1: call methods like the its a real reference.
	const uid = crypto.randomUUID();
	const tick = Math.random() > 0.5 ? "GOOG" : "APPL";

	const response = await orderBook.buy({
		tick,
		qty: 15,
	});

	// subscription2.unsubscribe();
	// subscription1.unsubscribe();

	// console.log("TIME SPENT", timeSpent.reduce((acc, curr) => acc + curr, 0) / timeSpent.length);
	// const response2 = await orderBook.buy({ tick: "APPL", qty: 50 });
	// console.log("response2", response2);

	// Example 2: call the methods but don't wait for the response
	// await orderBook.emit.buy({ tick: "APPL" });
	// console.log("SENT");
	//
};

const withPlugin = async () => {
	const withSQLite = client.spawn("WithSQLite", "Hector");

	await withSQLite.getTaskById('id:test')

	console.log('DONE');
}

const emittedEventsExample = async () => {
	const orderBook = client.spawn("OrderBook", "BTC/USD", {
		userID: "HECTOR",
	});
	const orderBook2 = client.spawn("OrderBook", "ETH/USD", {
		userID: "Henry",
	});

	// Example 1: can emit from client and handle from instance
	// and from client as well
	orderBook.emit("alphachannel", "asddas");
	orderBook.emit("orders", ["asddas"]);

	// orderBook.on("orders", (event) => {
	//   console.log("ON CLIENT 1", event);
	// });

	// orderBook2.on("orders", (event) => {
	//   console.log("ON CLIENT 2", event);
	// });

	// await orderBook.buy({ tick: "BTC/USD", qty: 1 });
	// await orderBook.buy({ tick: "BTC/USD (via skip)", qty: 1 });

	// await orderBook2.buy({ tick: "ETH/USD", qty: 1 });
	// await orderBook2.buy({ tick: "ETH/USD (via skip)", qty: 1 });

	// const intervalId = setInterval(async () => {
	//   const isSkip = Math.random() > 0.5;
	//   if (isSkip) {
	//     orderBook.skip.buy({ tick: "APPL" });
	//     return;
	//   }

	//   const prev = Date.now();
	//   const response = await orderBook.buy({ tick: "APPL" });
	//   const then = Date.now();

	//   console.log("response", response, then - prev);
	// }, 25);

	// await wait(10_000);
	// clearInterval(intervalId);
};

const errorHandlingExample = async () => {
	const errorExample = client.spawn("ErrorExample", "LOL", {

	});

	try {
		await wait(0);
		const response = await errorExample.doSomething("aaa");
	} catch (err: any) {
		console.log(
			"caught error",
			err instanceof Spawnkit.RemoteError,
			err.name === "SomeSpetialError",
		);
		console.log(err);
	}
};

const exampleBadCall = async () => {
	const orderBook = client.spawn("OrderBook", "BTC/EUR", {
		userID: "Henry",
	});

	try {
		// @ts-expect-error
		const response = await orderBook.elbaf({ tick: "APPL", qty: 10 });
		console.log(response);
	} catch (err) {
		console.log("ERR", err);
	}
};

const severalClients = async () => {
	const client1 = Spawnkit.Client.from({
		adapter: new RedisAdapter(redis),
		instances: instances,
	});

	const client2 = Spawnkit.Client.from({
		adapter: new RedisAdapter(redis),
		instances: instances,
	});

	const orderBook = client1.spawn("OrderBook", "BTC/EUR");
	await orderBook.buy({
		tick: "AAPL",
		qty: 10,
	});

	await wait(1000);
	const orderBook2 = client2.spawn("OrderBook", "BTC/EUR");
	await orderBook2.buy({
		tick: "GOOG",
		qty: 10,
	});
};

const getInternalUpdated = async () => {
	const orderBook = client.spawn("OrderBook", "BTC/EUR", {
		userID: "Henry",
	});

	orderBook.utils.on("error", (event) => {

	})

	const response = await orderBook.buy({
		tick: "AAPL",
		qty: 10,
	});


}

const errorOnLifeCycle = async () => {
	console.log('errorOnLifeCycle - 1');

	const initErrorExample = client.spawn("ErrorInitExample", "BTC/EUR", {

	});

	initErrorExample.on('error', (err) => {
		console.log("CLIENT ERROR", err);
	})



	try {

		const response = await initErrorExample.doSomething('message-AA');
		console.log('RESPONSE', response);
	} catch (err) {
		console.log("ERR", err);
	}

	console.log('errorOnLifeCycle - 2');

}
