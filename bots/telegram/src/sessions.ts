/**
 * In-memory session store for Telegram users.
 * Maps Telegram chat ID to linked email + domain.
 *
 * For production, this should be backed by Redis.
 * For now, in-memory is fine for personal testing.
 */

interface TelegramSession {
  email: string;
  domain: string;
  linked_at: string;
  last_active: string;
}

const sessions = new Map<number, TelegramSession>();

export function getSession(chatId: number): TelegramSession | undefined {
  return sessions.get(chatId);
}

export function setSession(chatId: number, email: string, domain: string): TelegramSession {
  const session: TelegramSession = {
    email,
    domain,
    linked_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
  };
  sessions.set(chatId, session);
  return session;
}

export function updateActivity(chatId: number): void {
  const session = sessions.get(chatId);
  if (session) {
    session.last_active = new Date().toISOString();
  }
}

export function removeSession(chatId: number): boolean {
  return sessions.delete(chatId);
}

export function isLinked(chatId: number): boolean {
  return sessions.has(chatId);
}
