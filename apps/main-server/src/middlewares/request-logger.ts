import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../infrastructure/database/pg-pool';

/**
 * Request logger middleware.
 * Logs METHOD path statusCode durationMs after each response.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - startedAt;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(JSON.stringify({
      level,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: ms,
      userId: req.headers['x-user-id'] ?? 'anonymous',
      timestamp: new Date().toISOString(),
    }));

    void getPool()
      .query(
        `INSERT INTO request_logs (method, path, status_code, duration_ms, user_id, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.method,
          req.originalUrl,
          res.statusCode,
          ms,
          (req.headers['x-user-id'] as string | undefined) ?? 'anonymous',
          req.ip,
        ]
      )
      .catch(() => undefined);
  });

  next();
}
