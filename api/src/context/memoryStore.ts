import { getRedis } from '../redis';
import type { UserContext } from '@shared/types';

const KEY_PREFIX = 'cardmgr:ctx:';
const TTL = 90 * 24 * 60 * 60; // 90 days

export async function getContext(email: string): Promise<UserContext | null> {
  const redis = getRedis();
  const raw = await redis.get(`${KEY_PREFIX}${email}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function setContext(email: string, ctx: UserContext): Promise<void> {
  const redis = getRedis();
  ctx.updated_at = new Date().toISOString();
  await redis.set(`${KEY_PREFIX}${email}`, JSON.stringify(ctx), { EX: TTL });
}

export async function getOrCreateContext(email: string): Promise<UserContext> {
  const existing = await getContext(email);
  if (existing) return existing;

  const ctx: UserContext = {
    email,
    cards: [],
    preferences: {},
    spending_patterns: {},
    linked_platforms: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await setContext(email, ctx);
  return ctx;
}

export async function updatePreferences(
  email: string,
  prefs: Partial<UserContext['preferences']>
): Promise<UserContext> {
  const ctx = await getOrCreateContext(email);
  ctx.preferences = { ...ctx.preferences, ...prefs };
  await setContext(email, ctx);
  return ctx;
}

export async function recordInteraction(email: string): Promise<void> {
  const ctx = await getOrCreateContext(email);
  ctx.last_interaction = new Date().toISOString();
  await setContext(email, ctx);
}
