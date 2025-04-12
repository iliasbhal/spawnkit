import { Redis, RedisOptions } from "ioredis";

import { MessageBroker } from "./lib/messages";
import { Lock } from "./lib/lock";
import { Data } from "./lib/data";
import { EventScheduler } from "./lib/events";
import { InstanceScheduler } from "./lib/instances";

// export const redisConfig: RedisOptions = {
// 	port: parseInt(process.env.REDIS_PORT!),
// 	host: process.env.REDIS_HOST,
// 	maxRetriesPerRequest: 0,
// 	enableAutoPipelining: true,
// 	showFriendlyErrorStack: true,
// };

// import { Redis, RedisOptions } from "ioredis";

// export const redisConfig: RedisOptions = {
// 	port: parseInt(process.env.REDIS_PORT!),
// 	host: process.env.REDIS_HOST,
// 	maxRetriesPerRequest: 0,
// 	enableAutoPipelining: true,
// 	showFriendlyErrorStack: true,
// };

// export const redis = new Redis(redisConfig);


export class RedisAdapter {
  lock: Lock;
  data: Data;
  messages: MessageBroker;
  events: EventScheduler;
  instances: InstanceScheduler;

  private getRedisClient(redis: Redis | RedisOptions): Redis {
    return redis instanceof Redis ? redis : new Redis(redis);
  }

  constructor(redis: Redis | RedisOptions) {
    const client = this.getRedisClient(redis);

    this.lock = new Lock(client);
    this.data = new Data(client);
    this.messages = new MessageBroker(client);
    this.events = new EventScheduler(client);
    this.instances = new InstanceScheduler(client);
  }
}
