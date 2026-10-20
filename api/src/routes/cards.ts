import { Router, Request, Response } from 'express';
import { requireAuth, requireSubscription } from '../auth/middleware';
import { getPortalConfig } from '../services/portalConfigService';
import * as healthService from '../services/healthService';
import * as anomalyService from '../services/anomalyService';
import * as statementService from '../services/statementService';
import { recordInteraction } from '../context/memoryStore';

const router = Router();

router.use(requireAuth);
router.use(requireSubscription);

// GET /cards/health
router.get('/health', async (req: Request, res: Response) => {
  try {
    const email = (req as any).cmEmail;
    const domain = (req as any).cmDomain;
    const cfg = await getPortalConfig(domain);

    const report = await healthService.getHealthReport(cfg, email);
    await recordInteraction(email);

    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'HEALTH_ERROR', message: err.message } });
  }
});

// GET /cards/anomalies/:cardId
router.get('/anomalies/:cardId', async (req: Request, res: Response) => {
  try {
    const email = (req as any).cmEmail;
    const domain = (req as any).cmDomain;
    const cardId = req.params.cardId as string;
    const cfg = await getPortalConfig(domain);

    const report = await anomalyService.getAnomalyReport(cfg, cardId);
    await recordInteraction(email);

    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'ANOMALY_ERROR', message: err.message } });
  }
});

// GET /cards/statement/:year/:month
router.get('/statement/:year/:month', async (req: Request, res: Response) => {
  try {
    const email = (req as any).cmEmail;
    const domain = (req as any).cmDomain;
    const year = parseInt(req.params.year as string);
    const month = parseInt(req.params.month as string);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid year or month' } });
    }

    const cfg = await getPortalConfig(domain);
    const statement = await statementService.getStatement(cfg, email, year, month);
    await recordInteraction(email);

    res.json({ success: true, data: statement });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'STATEMENT_ERROR', message: err.message } });
  }
});

export default router;
