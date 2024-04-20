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

export class OrderBook extends Spawnkit.Instance<
  OrderBookData,
  OrderBookEvent
> {
  on<C extends keyof OrderBookEvent>(channel: C, message: OrderBookEvent[C]) {
    console.log("ON INSTANCE", this.id, channel, message);
  }

  async buy(stock: Stock) {
    this.logger.log("-----BUYYYYY------");
    // this.data = this.data || ({} as any);
    // this.data!.count = this.data?.count || 0;
    // this.data!.count++;
    this.emit("orders", [stock.tick]);

    return {
      success: true,
      // count: this.data!.count,
      qty: 1000,
      stock,
    };
  }

  async multiple(...stocks: Stock[]) {
    return stocks.length;
  }

  async sell(stock: Stock): Promise<true> {
    return true;
  }
}
