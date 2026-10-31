import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4100'),
  redis: {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
  },
  zoqq: {
    configBaseUrl: process.env.CONFIG_BASE_URL || '',
    configXApiKey: process.env.CONFIG_X_API_KEY || '',
  },
  defaultDomain: process.env.DEFAULT_DOMAIN || '',
  jwtSecret: process.env.JWT_SECRET || '',
  subscriptionPrice: parseFloat(process.env.SUBSCRIPTION_PRICE || '5'),
  // Telegram bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || '', // e.g. https://your-app.vercel.app
  // AI Agent
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  maxConversationTurns: parseInt(process.env.MAX_CONVERSATION_TURNS || '50'),
  maxToolRoundtrips: parseInt(process.env.MAX_TOOL_ROUNDTRIPS || '10'),
};
