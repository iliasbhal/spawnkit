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

const worker = Spawnkit.Worker.listen({
  adapters: spawnORM,
  instances: [],
});

const client = Spawnkit.Client.from({
  adapters: spawnORM,
  instances: [],
});
