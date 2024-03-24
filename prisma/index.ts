require("dotenv-mono").load();
import { Redis, RedisOptions } from "ioredis";

import { PrismaClient } from "./generated/client";

export * as Zod from "./generated/zod";

export * from "./generated/client";
export const ORM = new PrismaClient();

export const redisConfig: RedisOptions = {
  port: parseInt(process.env.REDIS_PORT!),
  host: process.env.REDIS_HOST,
  maxRetriesPerRequest: 0,
  enableAutoPipelining: true,
  showFriendlyErrorStack: true,
};

export const redis = new Redis(redisConfig);
