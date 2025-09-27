import { createClient, RedisClientType } from "redis";

const g = globalThis as { redis?: RedisClientType };

export async function getRedisClient(): Promise<RedisClientType> {
  if (!g.redis) {
    g.redis = createClient({ url: process.env.REDIS_URL });
    await g.redis.connect();
  }

  if (!g.redis.isReady) {
    await g.redis.connect();
  }

  return g.redis;
}
