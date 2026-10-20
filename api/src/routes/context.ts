import { Router, Request, Response } from 'express';
import { requireAuth, requireSubscription } from '../auth/middleware';
import * as memoryStore from '../context/memoryStore';

const router = Router();

router.use(requireAuth);
router.use(requireSubscription);

// GET /context — Get user's Card Manager context
router.get('/', async (req: Request, res: Response) => {
  try {
    const email = (req as any).cmEmail;
    const ctx = await memoryStore.getOrCreateContext(email);
    res.json({ success: true, data: ctx });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'CONTEXT_ERROR', message: err.message } });
  }
});

// PATCH /context/preferences — Update user preferences
router.patch('/preferences', async (req: Request, res: Response) => {
  try {
    const email = (req as any).cmEmail;
    const prefs = req.body;
    const ctx = await memoryStore.updatePreferences(email, prefs);
    res.json({ success: true, data: ctx.preferences });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'CONTEXT_ERROR', message: err.message } });
  }
});

export default router;
