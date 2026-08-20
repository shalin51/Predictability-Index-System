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

  propertyOptions(req: Request, res: Response): void {
    respondJson(res, () => this.service.propertyOptions(req.params['id'] ?? ''), {
      errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404, ValidationError: 400 }, 500),
    });
  }

  createProperty(req: Request, res: Response): void {
    respondJson(res, () => this.service.createProperty(req.params['id'] ?? '', req.body ?? {}, this.changedBy(req)), {
      successStatus: 201,
      errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404, ValidationError: 400 }, 500),
    });
  }

  createPropertyDefinition(req: Request, res: Response): void {
    respondJson(res, () => this.service.createPropertyDefinition(req.body ?? {}, this.changedBy(req)), {
      successStatus: 201,
      errorStatus: (error) => resolveErrorStatus(error, { ConflictError: 409, ValidationError: 400 }, 500),
    });
  }

  updateProperty(req: Request, res: Response): void {
    respondJson(
      res,
      () => this.service.updateProperty(req.params['id'] ?? '', req.params['propertyFactId'] ?? '', req.body ?? {}, this.changedBy(req)),
      { errorStatus: (error) => resolveErrorStatus(error, { NotFoundError: 404, ValidationError: 400 }, 500) }
    );
  }

  private changedBy(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }
}
