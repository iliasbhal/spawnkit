import * as Spawnkit from "../src";

interface OrderBookData {
  orderBook: string[];
  count: number;
}

interface OrderBookEvent {
  orders: any[];
  alphachannel: string;
}

interface Stock {
  tick: string;
}

interface Order extends Pick<Stock, "tick"> {
  qty: number;
}

export class OrderBook extends Spawnkit.Instance<
  OrderBookData,
  OrderBookEvent
> {
  on<C extends keyof OrderBookEvent>(channel: C, message: OrderBookEvent[C]) {
    // console.log("ON INSTANCE", this.id, channel, message);
  }

  async buy(order: Order) {
    this.logger.log("-----BUYYYYY------");
    this.emit("orders", [order.tick, order.qty]);

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
