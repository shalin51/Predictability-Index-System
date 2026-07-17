import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

/**
 * Global Express error handler.
 * Must be registered LAST (after all routes).
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const status = Number((err as Error & { status?: number }).status);
  if (status === 413) {
    res.status(413).json({ error: 'Workbook exceeds the 10 MB limit', code: 'PAYLOAD_TOO_LARGE', timestamp: new Date().toISOString() });
    return;
  }

  // Unhandled / unexpected error
  console.error('[error-handler] Unexpected error:', err.stack ?? err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  });
}
