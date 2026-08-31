import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { PredictionService } from './prediction.service';

export class PredictionController {
  constructor(private readonly service: PredictionService) {}

  listForRun(req: Request, res: Response): void {
    respondJson(res, () => this.service.listForRun(req.params['runId'] ?? ''), { errorStatus: this.resolveStatus });
  }

  generate(req: Request, res: Response): void {
    const modelId = typeof req.body?.modelId === 'string' ? req.body.modelId : undefined;
    respondJson(
      res,
      () => this.service.generate(req.params['runId'] ?? '', this.changedBy(req), modelId),
      { errorStatus: this.resolveStatus, successStatus: 201 }
    );
  }

  private changedBy(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }

  private resolveStatus(error: Error): number {
    return resolveErrorStatus(
      error,
      { ConflictError: 409, NotFoundError: 404, PredictionProcessorError: 502, ValidationError: 400 },
      500
    );
  }
}
