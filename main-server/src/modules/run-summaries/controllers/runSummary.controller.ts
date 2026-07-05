import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../../core/http';
import type { RunSummaryService } from '../services/runSummary.service';

export class RunSummaryController {
  constructor(private readonly service: RunSummaryService) {}

  detail(req: Request, res: Response): void {
    respondJson(res, () => this.service.detail(req.params['runId'] ?? ''), { errorStatus: this.resolveStatus });
  }

  generate(req: Request, res: Response): void {
    respondJson(res, () => this.service.generate(req.params['runId'] ?? '', this.changedBy(req)), { errorStatus: this.resolveStatus });
  }

  regenerate(req: Request, res: Response): void {
    respondJson(res, () => this.service.regenerate(req.params['runId'] ?? '', this.changedBy(req)), { errorStatus: this.resolveStatus });
  }

  missingRequiredMetrics(req: Request, res: Response): void {
    respondJson(res, () => this.service.missingRequiredMetrics(req.params['runId'] ?? ''), { errorStatus: this.resolveStatus });
  }

  private changedBy(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }

  private resolveStatus(error: Error): number {
    return resolveErrorStatus(error, { ConflictError: 409, NotFoundError: 404, ValidationError: 400 }, 500);
  }
}
