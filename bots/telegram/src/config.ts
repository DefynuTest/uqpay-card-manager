import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  cmApiUrl: (process.env.CM_API_URL || 'http://localhost:4100').replace(/\/$/, ''),
  defaultDomain: process.env.DEFAULT_DOMAIN || '',
};

if (!config.botToken) {
  console.error('[TelegramBot] TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}
