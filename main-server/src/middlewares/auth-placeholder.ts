/**
 * auth-placeholder.ts
 *
 * Accepts a dashboard JWT or an API key for protected endpoints.
 */

import type { Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { config } from '../config/env';
import { verifyJwt } from '../modules/auth/jwt';
import { verifyEntraAccessToken } from '../modules/auth/entra-token';

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = createHash('sha256').update(left).digest();
  const rightBuffer = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function authPlaceholder(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip auth for health endpoints — they must remain public
  if (req.path.startsWith('/health') || req.path.startsWith('/version') || (config.auth.mode === 'password' && req.path === '/auth/login')) {
    next();
    return;
  }

  const authorization = req.headers['authorization'];
  const bearerToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';
  const entraUserId = config.auth.mode === 'entra' && bearerToken ? await verifyEntraAccessToken(bearerToken) : null;
  if (entraUserId) {
    req.headers['x-user-id'] = entraUserId;
    next();
    return;
  }
  const claims = config.auth.mode === 'password' && bearerToken && config.auth.jwtSecret
    ? verifyJwt(bearerToken, config.auth.jwtSecret)
    : null;

  if (claims) {
    req.headers['x-user-id'] = claims.sub;
    next();
    return;
  }

  const providedApiKey = req.headers['x-api-key'];
  if (
    typeof providedApiKey === 'string' &&
    Boolean(config.auth.apiKey) &&
    secureEqual(providedApiKey, config.auth.apiKey)
  ) {
    req.headers['x-user-id'] = 'api-key-client';
    next();
    return;
  }

  res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
}
