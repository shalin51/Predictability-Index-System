/**
 * api-version.ts
 *
 * API versioning middleware.
 * Sets X-API-Version response header.
 * Rejects requests targeting deprecated/sunset versions via Accept header.
 */

import type { Request, Response, NextFunction } from 'express';

const CURRENT_API_VERSION = 'v1';
const SUPPORTED_VERSIONS = new Set(['v1']);

export function apiVersion(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-API-Version', CURRENT_API_VERSION);
  res.setHeader('X-Service', 'amfpi-main-server');
  next();
}

export function requireApiVersion(req: Request, res: Response, next: NextFunction): void {
  const requested = req.headers['x-api-version'] as string | undefined;

  if (requested && !SUPPORTED_VERSIONS.has(requested)) {
    res.status(400).json({
      error: `API version '${requested}' is not supported. Supported: ${[...SUPPORTED_VERSIONS].join(', ')}`,
      code: 'UNSUPPORTED_API_VERSION',
    });
    return;
  }

  next();
}
