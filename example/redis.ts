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

const main = async () => {
  const invitation = client.actor("AAA", 123213);
  await invitation.send({ type: "ELEVATE" });
  await invitation.get();
  invitation.on("event", (event) => {});
  invitation.on("data", (data) => {});
};
