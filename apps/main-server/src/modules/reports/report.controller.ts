import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { ReportService } from './report.service';

export class ReportController {
  constructor(private readonly service: ReportService) {}

  generate(req: Request, res: Response): void {
    respondJson(res, () => this.service.generate(req.params['id'] ?? ''), {
      errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404 }, 500),
    });
  }
}
