import { Request, Response, NextFunction } from 'express';
import * as subscriptionService from '../services/subscriptionService';

/**
 * Extract email and domain from the request.
 * Card Manager API receives these via headers set by the portal
 * or directly from bot auth (Telegram/WhatsApp linking).
 */
export function extractAuth(req: Request): { email: string; domain: string } {
  // Portal SDK passes these headers
  const email = req.headers['x-cm-email'] as string;
  const domain = req.headers['x-cm-domain'] as string;

  if (!email) {
    throw { status: 401, code: 'AUTH_REQUIRED', message: 'Email not provided' };
  }
  if (!domain) {
    throw { status: 401, code: 'AUTH_REQUIRED', message: 'Domain not provided' };
  }

  return { email, domain };
}

/**
 * Middleware: require authenticated user (email + domain present).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, domain } = extractAuth(req);
    (req as any).cmEmail = email;
    (req as any).cmDomain = domain;
    next();
  } catch (err: any) {
    res.status(err.status || 401).json({
      success: false,
      error: { code: err.code || 'AUTH_REQUIRED', message: err.message },
    });
  }
}

/**
 * Middleware: require active subscription.
 */
export function requireSubscription(req: Request, res: Response, next: NextFunction) {
  const email = (req as any).cmEmail;
  if (!email) {
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_REQUIRED', message: 'Not authenticated' },
    });
  }

  subscriptionService.isSubscribed(email).then((active) => {
    if (!active) {
      return res.status(403).json({
        success: false,
        error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Card Manager subscription required' },
      });
    }
    next();
  }).catch((err) => {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Subscription check failed' },
    });
  });
}
