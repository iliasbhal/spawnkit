import { Adapters } from "@/adapters";
import * as Adapter from "../src/adapters/redis";
import { redis } from "../prisma";

export const adapters: Adapters = {
  lock: new Adapter.Lock(redis),
  snapshot: new Adapter.Snapshot(redis),
  events: new Adapter.Event(redis),
  eventBus: new Adapter.EventBus(redis),
  scheduler: new Adapter.Scheduler(redis),
  worker: new Adapter.Worker(redis, {
    concurrency: 50,
  }),
};
