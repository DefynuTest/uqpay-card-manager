/**
 * Redis-backed session store for Telegram users.
 * Maps Telegram chat ID to linked email + domain.
 */

import { createClient, RedisClientType } from 'redis';
import { config } from './config';

const KEY_PREFIX = 'cardmgr:tgsession:';
const TTL = 30 * 24 * 60 * 60; // 30 days

let redis: RedisClientType;

export interface TelegramSession {
  email: string;
  domain: string;
  linked_at: string;
  last_active: string;
}

export async function initSessionRedis(): Promise<void> {
  redis = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
    },
    password: config.redis.password,
  });

  redis.on('error', (err) => console.error('[Sessions] Redis error:', err));
  await redis.connect();
  console.log('[Sessions] Redis connected for session storage');
}

export async function getSession(chatId: number): Promise<TelegramSession | null> {
  const raw = await redis.get(`${KEY_PREFIX}${chatId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setSession(chatId: number, email: string, domain: string): Promise<TelegramSession> {
  const session: TelegramSession = {
    email,
    domain,
    linked_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
  };
  await redis.set(`${KEY_PREFIX}${chatId}`, JSON.stringify(session), { EX: TTL });
  return session;
}

export async function updateActivity(chatId: number): Promise<void> {
  const session = await getSession(chatId);
  if (session) {
    session.last_active = new Date().toISOString();
    await redis.set(`${KEY_PREFIX}${chatId}`, JSON.stringify(session), { EX: TTL });
  }
}

export async function removeSession(chatId: number): Promise<boolean> {
  const result = await redis.del(`${KEY_PREFIX}${chatId}`);
  return result > 0;
}
