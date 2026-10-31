import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  cmApiUrl: (process.env.CM_API_URL || 'http://localhost:4100').replace(/\/$/, ''),
  defaultDomain: process.env.DEFAULT_DOMAIN || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  // Agent settings
  maxConversationTurns: parseInt(process.env.MAX_CONVERSATION_TURNS || '50'),
  maxToolRoundtrips: parseInt(process.env.MAX_TOOL_ROUNDTRIPS || '10'),
};

if (!config.botToken) {
  console.error('[TelegramBot] TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

if (!config.anthropicApiKey) {
  console.error('[TelegramBot] ANTHROPIC_API_KEY is required');
  process.exit(1);
}
