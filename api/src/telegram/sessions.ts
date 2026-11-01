import { getRedis } from '../redis';

const KEY_PREFIX = 'cardmgr:tgsession:';
const PENDING_DOMAIN_PREFIX = 'cardmgr:pending_domain:';
const TTL = 30 * 24 * 60 * 60; // 30 days
const PENDING_TTL = 300; // 5 minutes (matches OTP TTL)

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

export async function setPendingDomain(chatId: number, domain: string): Promise<void> {
  const redis = getRedis();
  await redis.set(`${PENDING_DOMAIN_PREFIX}${chatId}`, domain, { ex: PENDING_TTL });
}

export async function getPendingDomain(chatId: number): Promise<string | null> {
  const redis = getRedis();
  return await redis.get<string>(`${PENDING_DOMAIN_PREFIX}${chatId}`);
}

export async function clearPendingDomain(chatId: number): Promise<void> {
  const redis = getRedis();
  await redis.del(`${PENDING_DOMAIN_PREFIX}${chatId}`);
}
