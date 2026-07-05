/**
 * auth-placeholder.ts
 *
 * Authentication placeholder middleware.
 * In V1, optionally uses a simple API-key header check as a security gate.
 * This will be replaced by proper JWT/OAuth2 in the authentication step.
 *
 * SECURITY NOTE:
 *   - The API key is read from the environment (APP_API_KEY).
 *   - If APP_API_KEY is not set, anonymous access is allowed.
 */

import type { Request, Response, NextFunction } from 'express';

export function authPlaceholder(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for health endpoints — they must remain public
  if (req.path.startsWith('/health') || req.path.startsWith('/version')) {
    next();
    return;
  }

  const apiKey = process.env['APP_API_KEY'];

  if (apiKey) {
    const provided = req.headers['x-api-key'];
    if (provided !== apiKey) {
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
