import * as Spawnkit from "../src";
import { baseRedisAdapters as adapters } from "../src/adapters/redis/base";
import * as instances from "./instances";

export const client = new Spawnkit.Client({
  adapters,
  instances,
});

export type Client = typeof client;

