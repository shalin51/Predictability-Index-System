import type { Request, Response } from 'express';
import { toError } from '../../core/http';
import type { HealthService } from './health.service';

/**
 * HealthController — thin HTTP adapter.
 * Contains NO business logic. Delegates entirely to HealthService.
 * Only responsibilities: parse request → call service → send response.
 */
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  getHealth(_req: Request, res: Response): void {
    res.json(this.healthService.getHealth());
  }

  getDbHealth(_req: Request, res: Response): void {
    void this.healthService
      .getDbHealth()
      .then((dto) => {
        res.status(dto.connected ? 200 : 503).json(dto);
      })
      .catch((err: unknown) => {
        const error = toError(err);
        res.status(503).json({
          status: 'error',
          database: 'unknown',
          connected: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      });
  }
}
