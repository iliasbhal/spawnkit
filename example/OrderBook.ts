import * as Spawnkit from "@/.";

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

export class OrderBook extends Spawnkit.Instance<
  OrderBookData,
  OrderBookEvent
> {
  signal(signal: Spawnkit.SignalEvent): void {}

  on<C extends keyof OrderBookEvent>(
    cha: C,
    message: OrderBookEvent[C],
  ): void {}

  // on<C extends keyof OrderBookEvent>(event: {
  //   channel: C;
  //   message: OrderBookEvent[C];
  // }) {}

  async buy(stock: Stock) {
    console.log("-----BUYYYYY------");
    // this.data = this.data || ({} as any);
    // this.data!.count = this.data?.count || 0;
    // this.data!.count++;
    this.emit("orders", ["AAA"]);

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
