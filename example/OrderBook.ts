import * as Spawnkit from "@/.";

interface OrderBookData {
  orderBook: string[];
  count: number;
}

interface OrderBookEvent {
  orders: string[];
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
    console.log("ON INSTANCE", this.id, channel, message);
  }

  async buy(order: Order) {
    this.logger.log("-----BUYYYYY------");
    // this.data = this.data || ({} as any);
    // this.data!.count = this.data?.count || 0;
    // this.data!.count++;
    this.emit("orders", [order.tick]);

    return {
      success: true,
      status: "pending...",
      // count: this.data!.count,
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
