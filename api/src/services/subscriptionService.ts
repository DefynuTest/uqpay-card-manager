import { getRedis } from '../redis';
import { config } from '../config';
import type { Subscription } from '@shared/types';

const KEY_PREFIX = 'cardmgr:sub:';

export async function getSubscription(email: string): Promise<Subscription> {
  const redis = getRedis();
  const raw = await redis.get(`${KEY_PREFIX}${email}`);
  if (!raw) {
    return { status: 'none', email };
  }
  try {
    return { ...JSON.parse(raw), email };
  } catch {
    return { status: 'none', email };
  }
}

export async function subscribe(email: string): Promise<Subscription> {
  const existing = await getSubscription(email);
  if (existing.status === 'active') return existing;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const sub: Subscription = {
    status: 'active',
    email,
    subscribed_at: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
  };

  const redis = getRedis();
  await redis.set(`${KEY_PREFIX}${email}`, JSON.stringify(sub));
  return sub;
}

export async function unsubscribe(email: string): Promise<Subscription> {
  const existing = await getSubscription(email);
  if (existing.status !== 'active') {
    throw new Error('No active subscription to cancel');
  }

  const sub: Subscription = {
    ...existing,
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  };

  const redis = getRedis();
  await redis.set(`${KEY_PREFIX}${email}`, JSON.stringify(sub));
  return sub;
}

export async function isSubscribed(email: string): Promise<boolean> {
  const sub = await getSubscription(email);
  return sub.status === 'active';
}

export function getPrice(): { amount: number; currency: string } {
  return { amount: config.subscriptionPrice, currency: 'USD' };
}
