import "dotenv/config";

import * as RedisAdapter from '../adapters/redis';
import Redis from "ioredis-mock";
import { waitFor } from "poll-until-promise";

export const redis = new Redis({
  port: parseInt(process.env.REDIS_PORT!),
  host: process.env.REDIS_HOST,
  maxRetriesPerRequest: 0,
  enableAutoPipelining: true,
  showFriendlyErrorStack: true,
});

export const testRedisAdapters = {
  lock: new RedisAdapter.Lock(redis),
  data: new RedisAdapter.Data(redis),
  messages: new RedisAdapter.MessageBroker(redis),
  events: new RedisAdapter.EventScheduler(redis),
  instances: new RedisAdapter.InstanceScheduler(redis),
  logger: new RedisAdapter.Logger(redis),
};


export async function waitUntilOK(callback: Function) {
  await waitFor(callback, {
    interval: 10,
  });
}
