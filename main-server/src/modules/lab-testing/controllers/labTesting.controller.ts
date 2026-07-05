import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../../core/http';
import type { LabTestingService } from '../services/labTesting.service';

export class LabTestingController {
  constructor(private readonly service: LabTestingService) {}

  queue(req: Request, res: Response): void {
    respondJson(res, () => this.service.queue(req.query as Record<string, unknown>), { errorStatus: this.resolveStatus });
  }

  run(req: Request, res: Response): void {
    respondJson(res, () => this.service.run(req.params['runId'] ?? ''), { errorStatus: this.resolveStatus });
  }

  samples(req: Request, res: Response): void {
    respondJson(res, () => this.service.samples(req.params['runId'] ?? ''), { errorStatus: this.resolveStatus });
  }

  results(req: Request, res: Response): void {
    respondJson(res, () => this.service.results(req.params['runId'] ?? ''), { errorStatus: this.resolveStatus });
  }

  start(req: Request, res: Response): void {
    respondJson(res, () => this.service.start(req.params['runId'] ?? '', this.changedBy(req)), { errorStatus: this.resolveStatus });
  }

  complete(req: Request, res: Response): void {
    respondJson(res, () => this.service.complete(req.params['runId'] ?? '', this.changedBy(req)), { errorStatus: this.resolveStatus });
  }

  private changedBy(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }

  private resolveStatus(error: Error): number {
    return resolveErrorStatus(error, { ConflictError: 409, NotFoundError: 404, ValidationError: 400 }, 500);
  }
}
