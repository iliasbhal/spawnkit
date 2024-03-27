import * as Spawnkit from "../../src";

interface OrderBookData {
  orderBook: string[];
}

interface OrderBookEvent {
  order: "buy" | "sell";
}

export class OrderBook extends Spawnkit.Instance<
  OrderBookData,
  OrderBookEvent
> {
  async start(): Promise<any> {}

  async stop(): Promise<any> {}

  async onEvent(event: OrderBookEvent): Promise<any> {
    console.log(event);
  }
}
