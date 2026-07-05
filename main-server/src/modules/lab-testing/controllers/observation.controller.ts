import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../../core/http';
import type { ObservationService } from '../services/observation.service';

export class ObservationController {
  constructor(private readonly service: ObservationService) {}

  create(req: Request, res: Response): void {
    respondJson(res, () => this.service.create(req.body as Record<string, unknown>, this.changedBy(req)), {
      successStatus: 201,
      errorStatus: this.resolveStatus,
    });
  }

  update(req: Request, res: Response): void {
    respondJson(res, () => this.service.update(req.params['observationId'] ?? '', req.body as Record<string, unknown>, this.changedBy(req)), {
      errorStatus: this.resolveStatus,
    });
  }

  private changedBy(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }

  private resolveStatus(error: Error): number {
    return resolveErrorStatus(error, { ConflictError: 409, NotFoundError: 404, ValidationError: 400 }, 500);
  }
}
