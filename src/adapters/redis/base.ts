import "dotenv/config";

import * as RedisAdapter from './index';
import { redis } from './client';

export const baseRedisAdapters = {
  lock: new RedisAdapter.Lock(redis),
  data: new RedisAdapter.Data(redis),
  messages: new RedisAdapter.MessageBroker(redis),
  events: new RedisAdapter.EventScheduler(redis),
  instances: new RedisAdapter.InstanceScheduler(redis),
  logger: new RedisAdapter.Logger(redis),
};