import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { initRedis } from './redis';
import subscriptionRoutes from './routes/subscription';
import cardsRoutes from './routes/cards';
import contextRoutes from './routes/context';

const app = express();

async function start() {
  // Initialize Redis
  await initRedis();
  console.log('[CardManager] Redis connected');

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  });
  app.use(limiter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'card-manager-api', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/v1/subscription', subscriptionRoutes);
  app.use('/api/v1/cards', cardsRoutes);
  app.use('/api/v1/context', contextRoutes);

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[CardManager] Unhandled error:', err.message);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  app.listen(config.port, () => {
    console.log(`[CardManager] API running on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('[CardManager] Failed to start:', err);
  process.exit(1);
});

export default app;
