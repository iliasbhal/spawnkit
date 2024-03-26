import { Adapters } from "@/adapters";
import * as Spawnkit from "../src";
import * as Adapter from "../src/adapters/redis";
import { redis } from "../prisma";

const spawnORM: Adapters = {
  lock: new Adapter.Lock(redis),
  snapshot: new Adapter.Snapshot(redis),
  events: new Adapter.Event(redis),
  scheduler: new Adapter.Scheduler(redis),
  worker: new Adapter.Worker(redis),
};

interface SpotMarketData {
  orderBook: string[];
}

interface SpotMarketEvent {
  order: "buy" | "sell";
}

class SpotMarket extends Spawnkit.Instance<SpotMarketData, SpotMarketEvent> {}

interface GameSessionData {
  board: string[][];
}

interface GameSessionEvent {
  action: "move" | "jump";
}

class GameSession extends Spawnkit.Instance<
  GameSessionData,
  GameSessionEvent
> {}

const worker = Spawnkit.Worker.listen({
  adapters: spawnORM,
  instances: { SpotMarket, GameSession },
});

const client = Spawnkit.Client.from({
  adapters: spawnORM,
  instances: { SpotMarket, GameSession },
});

const main = async () => {
  const spotMarket = client.actor("GameSession", 123213);
  await spotMarket.send({ action: "jump" });
  await spotMarket.get();
  spotMarket.on("event", (event) => {});
  spotMarket.on("data", (data) => {});
};
