import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4100'),
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  zoqq: {
    configBaseUrl: process.env.CONFIG_BASE_URL || '',
    configXApiKey: process.env.CONFIG_X_API_KEY || '',
  },
  defaultDomain: process.env.DEFAULT_DOMAIN || '',
  jwtSecret: process.env.JWT_SECRET || '',
  subscriptionPrice: parseFloat(process.env.SUBSCRIPTION_PRICE || '5'),
};
