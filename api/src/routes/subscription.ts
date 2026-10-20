import { Router, Request, Response } from 'express';
import * as subscriptionService from '../services/subscriptionService';
import { requireAuth } from '../auth/middleware';

const router = Router();

router.use(requireAuth);

// GET /subscription
router.get('/', async (req: Request, res: Response) => {
  try {
    const email = (req as any).cmEmail;
    const sub = await subscriptionService.getSubscription(email);
    const price = subscriptionService.getPrice();

    res.json({
      success: true,
      data: {
        status: sub.status,
        subscribed_at: sub.subscribed_at || null,
        current_period_end: sub.current_period_end || null,
        price: price.amount,
        currency: price.currency,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVICE_ERROR', message: err.message } });
  }
});

// POST /subscription/subscribe
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const email = (req as any).cmEmail;
    const sub = await subscriptionService.subscribe(email);

    res.json({
      success: true,
      data: {
        status: sub.status,
        subscribed_at: sub.subscribed_at,
        current_period_end: sub.current_period_end,
        message: 'Successfully subscribed to Personalized Card Manager',
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'SUBSCRIBE_FAILED', message: err.message } });
  }
});

// POST /subscription/unsubscribe
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const email = (req as any).cmEmail;
    const sub = await subscriptionService.unsubscribe(email);

    res.json({
      success: true,
      data: { status: sub.status, message: 'Subscription cancelled' },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'UNSUBSCRIBE_FAILED', message: err.message } });
  }
});

export default router;
