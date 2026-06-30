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

  // Unhandled / unexpected error
  console.error('[error-handler] Unexpected error:', err.stack ?? err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  });
}
