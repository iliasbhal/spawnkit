import * as Spawnkit from "../src";

interface OrderBookData {
	orderBook: string[];
	count: number;
}

interface OrderBookEvent {
	buyOrders: any[];
	orders: any[];
	alphachannel: string;
}

interface OrderBookContext {
	userID: string;
}

interface Stock {
	tick: string;
}



interface Order extends Pick<Stock, "tick"> {
	qty: number;
}

export class OrderBook extends Spawnkit.Instance<OrderBookContext, OrderBookData, OrderBookEvent> {
	initialize(): void {

	}

	on<C extends keyof OrderBookEvent>(channel: C, message: OrderBookEvent[C]) {
		if (channel === "buyOrders") {
			const mdg = message;
			this.emit("orders", mdg as any);
			return;
		}
		// console.log("ON INSTANCE", this.id, channel, message);
	}

	async buy(order: Order) {
		this.context.userID
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
