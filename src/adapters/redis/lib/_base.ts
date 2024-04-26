import { Redis } from "ioredis";
import * as BullMQ from "bullmq";

export class RedisAdapter {
  redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }
}

export class BaseQueue {
  redis: Redis;
  constructor(client: Redis) {
    this.redis = client;
  }

  createQueue(name: string) {
    return new BullMQ.Queue(name, {
      connection: this.redis,
      prefix: "spawnkit:queues:",
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
  }
}
