import { Redis } from '@upstash/redis';
import { config } from './config';

let client: Redis | null = null;

/**
 * Get the Upstash Redis client (lazy-initialized).
 * Uses HTTP REST API — works in serverless environments.
 */
export function getRedis(): Redis {
  if (client) return client;

  if (!config.redis.url || !config.redis.token) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
  }

  client = new Redis({
    url: config.redis.url,
    token: config.redis.token,
  });

  return client;
}
