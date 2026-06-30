import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { FormulationService } from './formulation.service';

export class FormulationController {
  constructor(private readonly svc: FormulationService) {}

  list(req: Request, res: Response): void {
    const page = parseInt(req.query['page'] as string || '1', 10);
    const pageSize = Math.min(parseInt(req.query['pageSize'] as string || '20', 10), 100);

    respondJson(res, () => this.svc.list(page, pageSize), {
      errorStatus: (error) => resolveErrorStatus(error, {}, 500),
    });
  }

  getById(req: Request, res: Response): void {
    respondJson(res, () => this.svc.getById(req.params['id'] ?? ''), {
      errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404 }, 500),
    });
  }

  create(req: Request, res: Response): void {
    const changedBy = (req.headers['x-user-id'] as string) || 'anonymous';
    respondJson(res, () => this.svc.create(req.body as never, changedBy), {
      successStatus: 201,
      errorStatus: (error) => resolveErrorStatus(error, { ValidationError: 400, ConflictError: 409 }, 500),
    });
  }

  update(req: Request, res: Response): void {
    const changedBy = (req.headers['x-user-id'] as string) || 'anonymous';
    respondJson(res, () => this.svc.update(req.params['id'] ?? '', req.body as never, changedBy), {
      errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404, ValidationError: 400 }, 500),
    });
  }
}
