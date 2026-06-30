/**
 * auth-placeholder.ts
 *
 * Authentication placeholder middleware.
 * In V1, uses a simple API-key header check as a security gate.
 * This will be replaced by proper JWT/OAuth2 in the authentication step.
 *
 * SECURITY NOTE:
 *   - The API key is read from the environment (APP_API_KEY).
 *   - If APP_API_KEY is not set in production, all requests are rejected.
 *   - dev mode without APP_API_KEY set allows anonymous access.
 */

import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

const API_KEY = process.env['APP_API_KEY'];
const IS_PROD = config.nodeEnv === 'production';

export function authPlaceholder(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for health endpoints — they must remain public
  if (req.path.startsWith('/health') || req.path.startsWith('/version')) {
    next();
    return;
  }

  // In production, require API key
  if (IS_PROD) {
    if (!API_KEY) {
      res.status(503).json({ error: 'Server misconfiguration: APP_API_KEY not set' });
      return;
    }
    const provided = req.headers['x-api-key'];
    if (provided !== API_KEY) {
      res.status(401).json({ error: 'Unauthorized', code: 'INVALID_API_KEY' });
      return;
    }
  }

  // Set a user identifier for audit trail
  if (!req.headers['x-user-id']) {
    req.headers['x-user-id'] = 'anonymous';
  }

  next();
}
