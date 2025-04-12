import { waitFor } from "poll-until-promise";

import * as Spawnkit from '../';
import RedisMock from "ioredis-mock";

export const redis = new RedisMock({
  port: parseInt(process.env.REDIS_PORT!),
  host: process.env.REDIS_HOST,
  maxRetriesPerRequest: null,
  enableAutoPipelining: true,
  showFriendlyErrorStack: true,
});

export const testRedisAdapters = new Spawnkit.Adapters.RedisAdapter(redis);

export async function waitUntilOK(callback: Function) {
  await waitFor(callback, {
    interval: 10,
  });
}
