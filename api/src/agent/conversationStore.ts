import { getRedis } from '../redis';
import { config } from '../config';
import type Anthropic from '@anthropic-ai/sdk';

const KEY_PREFIX = 'cardmgr:conv:';
const TTL = 24 * 60 * 60; // 24 hours

type MessageParam = Anthropic.MessageParam;

export async function getHistory(chatId: number): Promise<MessageParam[]> {
  const redis = getRedis();
  const data = await redis.get<MessageParam[]>(`${KEY_PREFIX}${chatId}`);
  return data || [];
}

export async function appendTurn(
  chatId: number,
  userMessage: MessageParam,
  assistantMessage: MessageParam
): Promise<void> {
  const history = await getHistory(chatId);
  history.push(userMessage, assistantMessage);

  const maxMessages = config.maxConversationTurns * 2;
  const trimmed = history.length > maxMessages
    ? history.slice(history.length - maxMessages)
    : history;

  const redis = getRedis();
  await redis.set(`${KEY_PREFIX}${chatId}`, trimmed, { ex: TTL });
}

export async function clearHistory(chatId: number): Promise<void> {
  const redis = getRedis();
  await redis.del(`${KEY_PREFIX}${chatId}`);
}
