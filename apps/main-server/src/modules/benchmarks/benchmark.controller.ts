import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { BenchmarkService } from './benchmark.service';

export class BenchmarkController {
  constructor(private readonly service: BenchmarkService) {}

  list(_req: Request, res: Response): void {
    respondJson(res, () => this.service.list(), {
      errorStatus: (error) => resolveErrorStatus(error, {}, 500),
    });
  }

  getById(req: Request, res: Response): void {
    respondJson(res, () => this.service.getById(this.getId(req)), {
      errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404 }, 500),
    });
  }

  getMetrics(req: Request, res: Response): void {
    respondJson(res, () => this.service.getMetrics(this.getId(req)), {
      errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404 }, 500),
    });
  }

  upsertMetric(req: Request, res: Response): void {
    respondJson(
      res,
      () => this.service.upsertMetric(this.getId(req), this.getMetricName(req), req.body as never),
      {
        errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404, ValidationError: 400 }, 500),
      }
    );
  }

  validateWeights(req: Request, res: Response): void {
    respondJson(res, () => this.service.validateWeights(this.getId(req)), {
      errorStatus: (error) => resolveErrorStatus(error, {}, 500),
    });
  }

  private getId(req: Request): string {
    return req.params['id'] ?? '';
  }

  private getMetricName(req: Request): string {
    return req.params['metricName'] ?? '';
  }
}
