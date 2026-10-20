import { createClient, RedisClientType } from 'redis';
import { config } from './config';

let client: RedisClientType | null = null;

export async function initRedis(): Promise<RedisClientType> {
  if (client) return client;

  client = createClient({
    socket: { host: config.redis.host, port: config.redis.port },
    password: config.redis.password,
  });

  client.on('error', (err) => console.error('[Redis] Error:', err.message));
  client.on('ready', () => console.log('[Redis] Connected'));

  await client.connect();
  return client;
}

export function getRedis(): RedisClientType {
  if (!client) throw new Error('Redis not initialized');
  return client;
}
