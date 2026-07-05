import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { FormulationService } from './formulation.service';
import type { FormulationListQuery } from './formulation.types';

export class FormulationController {
  constructor(private readonly service: FormulationService) {}

  list(req: Request, res: Response): void {
    respondJson(res, () => this.service.list(this.getQuery(req)), { errorStatus: this.resolveStatus });
  }

  options(_req: Request, res: Response): void {
    respondJson(res, () => this.service.options(), { errorStatus: this.resolveStatus });
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

  approve(req: Request, res: Response): void {
    respondJson(res, () => this.service.approve(req.params['id'] ?? '', this.getChangedBy(req)), { errorStatus: this.resolveStatus });
  }

  archive(req: Request, res: Response): void {
    respondJson(res, () => this.service.archive(req.params['id'] ?? '', this.getChangedBy(req)), { errorStatus: this.resolveStatus });
  }

  duplicate(req: Request, res: Response): void {
    respondJson(res, () => this.service.duplicate(req.params['id'] ?? '', this.getChangedBy(req)), {
      successStatus: 201,
      errorStatus: this.resolveStatus,
    });
  }

  private getQuery(req: Request): FormulationListQuery {
    return {
      createdFrom: req.query['createdFrom'] as string | undefined,
      createdTo: req.query['createdTo'] as string | undefined,
      materialId: req.query['materialId'] as string | undefined,
      search: req.query['search'] as string | undefined,
      status: req.query['status'] as FormulationListQuery['status'],
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
