import * as Spawnkit from "@/.";

interface OrderBookData {
  orderBook: string[];
  count: number;
}

interface OrderEentBus {
  change: string[];
}

interface Stock {
  tick: string;
}

export class OrderBook extends Spawnkit.Instance<OrderBookData, OrderEentBus> {
  async start(): Promise<any> {}
  async stop(): Promise<any> {}

  async buy(stock: Stock) {
    this.data = this.data || {};
    this.data!.count = this.data?.count || 0;
    this.data!.count++;

    this.emit("change", this.data!.count);

    return {
      success: true,
      count: this.data!.count,
      qty: 1000,
    };
  }

  async sell(stock: Stock): Promise<true> {
    return true;
  }
}
