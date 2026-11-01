import { getRedis } from '../redis';
import crypto from 'crypto';

const OTP_PREFIX = 'cardmgr:otp:';
const OTP_TTL = 300; // 5 minutes
const MAX_ATTEMPTS = 3;
const COOLDOWN_PREFIX = 'cardmgr:otp_cd:';
const COOLDOWN_TTL = 60; // 1 minute between resends

interface OtpRecord {
  code: string;
  email: string;
  attempts: number;
  created_at: string;
}

/**
 * Generate a 6-digit OTP and store it in Redis keyed by chatId.
 * Returns null if cooldown is active (user requested OTP too recently).
 */
export async function generateOtp(chatId: number, email: string): Promise<string | null> {
  const redis = getRedis();

  // Check cooldown
  const cooldownKey = `${COOLDOWN_PREFIX}${chatId}`;
  const cooldown = await redis.get(cooldownKey);
  if (cooldown) return null;

  const code = crypto.randomInt(100000, 999999).toString();

  const record: OtpRecord = {
    code,
    email: email.toLowerCase(),
    attempts: 0,
    created_at: new Date().toISOString(),
  };

  const key = `${OTP_PREFIX}${chatId}`;
  await redis.set(key, record, { ex: OTP_TTL });
  await redis.set(cooldownKey, '1', { ex: COOLDOWN_TTL });

  return code;
}

/**
 * Verify an OTP for a given chatId.
 * Returns the email if valid, null if invalid/expired.
 */
export async function verifyOtp(chatId: number, inputCode: string): Promise<string | null> {
  const redis = getRedis();
  const key = `${OTP_PREFIX}${chatId}`;
  const record = await redis.get<OtpRecord>(key);

  if (!record) return null; // Expired or never generated

  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(key); // Burn the OTP after max attempts
    return null;
  }

  if (record.code !== inputCode.trim()) {
    // Increment attempt count
    record.attempts++;
    const ttl = await redis.ttl(key);
    await redis.set(key, record, { ex: ttl > 0 ? ttl : OTP_TTL });
    return null;
  }

  // Valid — clean up
  await redis.del(key);
  return record.email;
}

/**
 * Check if a chatId has a pending OTP (user is mid-verification).
 */
export async function hasPendingOtp(chatId: number): Promise<boolean> {
  const redis = getRedis();
  const record = await redis.get(`${OTP_PREFIX}${chatId}`);
  return !!record;
}

/**
 * Cancel a pending OTP.
 */
export async function cancelOtp(chatId: number): Promise<void> {
  const redis = getRedis();
  await redis.del(`${OTP_PREFIX}${chatId}`);
}
