import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import subscriptionRoutes from './routes/subscription';
import cardsRoutes from './routes/cards';
import contextRoutes from './routes/context';
import webhookRoutes from './routes/webhook';

const app = express();

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
app.use('/webhook', webhookRoutes);

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[CardManager] Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
});

export default app;
