import * as Spawnkit from "@/.";

interface OrderBookData {
  orderBook: string[];
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
    return {
      success: true,
      qty: 1000,
    };
  }

  async sell(stock: Stock): Promise<true> {
    return true;
  }
}
