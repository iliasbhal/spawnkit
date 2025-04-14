import RedisMock from "ioredis-mock";
import Redis from "ioredis";
import { RedisAdapter } from "../redis";

export class InMemoryAdapter extends RedisAdapter {
  constructor(config?: { id?: string }) {
    const redisInMemory = InMemoryAdapter.getRedisMemoryClient(config?.id);
    super(redisInMemory);
  }

  static idx = 0;
  static all = new Map<string, Redis>();

  static getRedisMemoryClient(id?: string) {
    if (id && InMemoryAdapter.all.has(id)) {
      return InMemoryAdapter.all.get(id);
    }

    const redis = new RedisMock({
      port: 6379 + InMemoryAdapter.idx++,
    });

    if (id) {
      InMemoryAdapter.all.set(id, redis);
    }

    return redis;
  }
}
