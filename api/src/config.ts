import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4100'),
  redis: {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
  },
  // ZOQQ API credentials (from env / secrets manager)
  zoqq: {
    baseUrlApi: process.env.ZOQQ_BASE_URL_API || '',
    xApiKey: process.env.ZOQQ_X_API_KEY || '',
    programId: process.env.ZOQQ_PROGRAM_ID || '',
    clientId: process.env.ZOQQ_CLIENT_ID || '',
    personId: process.env.ZOQQ_PERSON_ID || '',
    businessId: process.env.ZOQQ_BUSINESS_ID || '',
    agentCode: process.env.ZOQQ_AGENT_CODE || '',
    subagentCode: process.env.ZOQQ_SUBAGENT_CODE || '',
    domainName: process.env.ZOQQ_DOMAIN_NAME || process.env.DEFAULT_DOMAIN || '',
  },
  // Static IP proxy (DigitalOcean proxy for ZOQQ API calls)
  proxy: {
    url: process.env.STATIC_IP_PROXY_URL || '',
    secret: process.env.STATIC_IP_PROXY_SECRET || '',
  },
  subscriptionPrice: parseFloat(process.env.SUBSCRIPTION_PRICE || '5'),
  // Telegram bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || '',
  // AI Agent
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  maxConversationTurns: parseInt(process.env.MAX_CONVERSATION_TURNS || '50'),
  maxToolRoundtrips: parseInt(process.env.MAX_TOOL_ROUNDTRIPS || '10'),
};
