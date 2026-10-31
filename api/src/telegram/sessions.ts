import { getRedis } from '../redis';

const KEY_PREFIX = 'cardmgr:tgsession:';
const TTL = 30 * 24 * 60 * 60; // 30 days

export interface TelegramSession {
  email: string;
  domain: string;
  linked_at: string;
  last_active: string;
}

export async function getSession(chatId: number): Promise<TelegramSession | null> {
  const redis = getRedis();
  const data = await redis.get<TelegramSession>(`${KEY_PREFIX}${chatId}`);
  return data || null;
}

export async function setSession(chatId: number, email: string, domain: string): Promise<TelegramSession> {
  const session: TelegramSession = {
    email,
    domain,
    linked_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
  };
  const redis = getRedis();
  await redis.set(`${KEY_PREFIX}${chatId}`, session, { ex: TTL });
  return session;
}

export async function updateActivity(chatId: number): Promise<void> {
  const session = await getSession(chatId);
  if (session) {
    session.last_active = new Date().toISOString();
    const redis = getRedis();
    await redis.set(`${KEY_PREFIX}${chatId}`, session, { ex: TTL });
  }
}

export async function removeSession(chatId: number): Promise<boolean> {
  const redis = getRedis();
  const result = await redis.del(`${KEY_PREFIX}${chatId}`);
  return result > 0;
}
