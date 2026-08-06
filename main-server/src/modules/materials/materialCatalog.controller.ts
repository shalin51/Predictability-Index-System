import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { MaterialCatalogService } from './materialCatalog.service';

export class MaterialCatalogController {
  constructor(private readonly service: MaterialCatalogService) {}

  detail(req: Request, res: Response): void {
    respondJson(res, () => this.service.detail(req.params['id'] ?? ''), {
      errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404 }, 500),
    });
  }
}
