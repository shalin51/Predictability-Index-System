import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { ProductionRunService } from './productionRun.service';
import type { ProductionRunListQuery, ProductionRunStatus } from './productionRun.types';

export class ProductionRunController {
  constructor(private readonly service: ProductionRunService) {}

  list(req: Request, res: Response): void {
    respondJson(res, () => this.service.list(this.getQuery(req)), { errorStatus: this.resolveStatus });
  }

  approvedFormulations(_req: Request, res: Response): void {
    respondJson(res, () => this.service.approvedFormulations(), { errorStatus: this.resolveStatus });
  }

  detail(req: Request, res: Response): void {
    respondJson(res, () => this.service.detail(req.params['id'] ?? ''), { errorStatus: this.resolveStatus });
  }

  create(req: Request, res: Response): void {
    respondJson(res, () => this.service.create(req.body as Record<string, unknown>, this.getChangedBy(req)), {
      successStatus: 201,
      errorStatus: this.resolveStatus,
    });
  }

  update(req: Request, res: Response): void {
    respondJson(res, () => this.service.update(req.params['id'] ?? '', req.body as Record<string, unknown>, this.getChangedBy(req)), {
      errorStatus: this.resolveStatus,
    });
  }

  updateStatus(req: Request, res: Response): void {
    respondJson(
      res,
      () => this.service.updateStatus(req.params['id'] ?? '', String(req.body?.['status'] ?? '') as ProductionRunStatus, this.getChangedBy(req)),
      { errorStatus: this.resolveStatus }
    );
  }

  archive(req: Request, res: Response): void {
    respondJson(res, () => this.service.archive(req.params['id'] ?? '', this.getChangedBy(req)), { errorStatus: this.resolveStatus });
  }

  private getQuery(req: Request): ProductionRunListQuery {
    return {
      dateProduced: req.query['dateProduced'] as string | undefined,
      formulationId: req.query['formulationId'] as string | undefined,
      machineId: req.query['machineId'] as string | undefined,
      moldId: req.query['moldId'] as string | undefined,
      search: req.query['search'] as string | undefined,
      status: req.query['status'] as ProductionRunListQuery['status'],
      targetBenchmarkId: req.query['targetBenchmarkId'] as string | undefined,
    };
  }

  private getChangedBy(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }

  private resolveStatus(error: Error): number {
    return resolveErrorStatus(error, { ConflictError: 409, NotFoundError: 404, ValidationError: 400 }, 500);
  }
}
