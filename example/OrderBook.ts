import * as Spawnkit from "@/.";

interface OrderBookData {
  orderBook: string[];
  count: number;
}

interface OrderBookEvent {
  orders: any[];
}

interface Stock {
  tick: string;
}

export class OrderBook extends Spawnkit.Instance<
  OrderBookData,
  OrderBookEvent
> {
  async start(): Promise<any> {}
  async stop(): Promise<any> {}

  async buy(stock: Stock) {
    console.log("-----BUYYYYY------");
    this.data = this.data || ({} as any);
    this.data!.count = this.data?.count || 0;
    this.data!.count++;

    this.emit("orders", [this.data!.count]);

    return {
      success: true,
      count: this.data!.count,
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
