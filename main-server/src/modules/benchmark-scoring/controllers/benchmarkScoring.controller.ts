import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../../core/http';
import type { BenchmarkScoringService } from '../services/benchmarkScoring.service';

export class BenchmarkScoringController {
  constructor(private readonly service: BenchmarkScoringService) {}

  runScores(req: Request, res: Response): void {
    respondJson(res, () => this.service.runScores(req.params['runId'] ?? ''), { errorStatus: this.resolveStatus });
  }

  generate(req: Request, res: Response): void {
    respondJson(res, () => this.service.generate(req.params['runId'] ?? '', this.changedBy(req)), { errorStatus: this.resolveStatus });
  }

  regenerate(req: Request, res: Response): void {
    respondJson(res, () => this.service.regenerate(req.params['runId'] ?? '', this.changedBy(req)), { errorStatus: this.resolveStatus });
  }

  compare(req: Request, res: Response): void {
    respondJson(res, () => this.service.compare(req.params['runId'] ?? ''), { errorStatus: this.resolveStatus });
  }

  report(req: Request, res: Response): void {
    respondJson(res, () => this.service.report(req.params['scoreReportId'] ?? ''), { errorStatus: this.resolveStatus });
  }

  private changedBy(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }

  private resolveStatus(error: Error): number {
    return resolveErrorStatus(error, { ConflictError: 409, NotFoundError: 404, ValidationError: 400 }, 500);
  }
}
