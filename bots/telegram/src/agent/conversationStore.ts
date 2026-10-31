import { createClient, RedisClientType } from 'redis';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

const KEY_PREFIX = 'cardmgr:conv:';
const TTL = 24 * 60 * 60; // 24 hours — conversations expire after a day of inactivity

let redis: RedisClientType;

export async function initConversationRedis(): Promise<void> {
  redis = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
    },
    password: config.redis.password,
  });

  redis.on('error', (err) => console.error('[ConvStore] Redis error:', err));
  await redis.connect();
  console.log('[ConvStore] Redis connected for conversation storage');
}

export function getConversationRedis(): RedisClientType {
  return redis;
}

type MessageParam = Anthropic.MessageParam;

/**
 * Get conversation history for a chat.
 */
export async function getHistory(chatId: number): Promise<MessageParam[]> {
  const raw = await redis.get(`${KEY_PREFIX}${chatId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Append a user message and assistant response to history.
 * Trims to max turns to prevent unbounded growth.
 */
export async function appendTurn(
  chatId: number,
  userMessage: MessageParam,
  assistantMessage: MessageParam
): Promise<void> {
  const history = await getHistory(chatId);
  history.push(userMessage, assistantMessage);

  // Keep only the last N turns (each turn = user + assistant = 2 messages)
  const maxMessages = config.maxConversationTurns * 2;
  const trimmed = history.length > maxMessages
    ? history.slice(history.length - maxMessages)
    : history;

  await redis.set(`${KEY_PREFIX}${chatId}`, JSON.stringify(trimmed), { EX: TTL });
}

/**
 * Clear conversation history (e.g., on /reset or unlink).
 */
export async function clearHistory(chatId: number): Promise<void> {
  await redis.del(`${KEY_PREFIX}${chatId}`);
}
