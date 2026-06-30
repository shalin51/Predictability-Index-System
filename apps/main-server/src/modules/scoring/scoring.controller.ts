import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { ScoringService } from './scoring.service';

export class ScoringController {
  constructor(private readonly service: ScoringService) {}

  score(req: Request, res: Response): void {
    respondJson(
      res,
      () =>
        this.service.score({
          formulationId: this.getFormulationId(req),
          benchmarkId: (req.body as Record<string, string>)['benchmarkId'] ?? '',
        }),
      {
        errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404 }, 500),
      }
    );
  }

  scoreAgainstAll(req: Request, res: Response): void {
    respondJson(res, () => this.service.scoreAgainstAll(this.getFormulationId(req)), {
      errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404 }, 500),
    });
  }

  summarize(req: Request, res: Response): void {
    respondJson(res, () => this.service.summarize(this.getFormulationId(req)), {
      errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404 }, 500),
    });
  }

  private getFormulationId(req: Request): string {
    return req.params['id'] ?? '';
  }
}
