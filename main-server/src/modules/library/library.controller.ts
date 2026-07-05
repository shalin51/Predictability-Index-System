import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { LibraryService } from './library.service';
import type { LibraryListQuery } from './library.types';

export class LibraryController {
  constructor(private readonly service: LibraryService) {}

  list(req: Request, res: Response): void {
    respondJson(res, () => this.service.list(this.getResource(req), this.getQuery(req)), {
      errorStatus: this.resolveStatus,
    });
  }

  options(req: Request, res: Response): void {
    respondJson(res, () => this.service.options(this.getResource(req)), {
      errorStatus: this.resolveStatus,
    });
  }

  create(req: Request, res: Response): void {
    respondJson(res, () => this.service.create(this.getResource(req), req.body as Record<string, unknown>, this.getChangedBy(req)), {
      successStatus: 201,
      errorStatus: this.resolveStatus,
    });
  }

  update(req: Request, res: Response): void {
    respondJson(
      res,
      () => this.service.update(this.getResource(req), req.params['id'] ?? '', req.body as Record<string, unknown>, this.getChangedBy(req)),
      { errorStatus: this.resolveStatus }
    );
  }

  archive(req: Request, res: Response): void {
    respondJson(res, () => this.service.archive(this.getResource(req), req.params['id'] ?? '', this.getChangedBy(req)), {
      errorStatus: this.resolveStatus,
    });
  }

  validateWeights(req: Request, res: Response): void {
    respondJson(res, () => this.service.validateWeights(String(req.query['benchmarkId'] ?? '')), {
      errorStatus: this.resolveStatus,
    });
  }

  private getResource(req: Request): string {
    return req.params['resource'] ?? '';
  }

  private getQuery(req: Request): LibraryListQuery {
    return {
      category: req.query['category'] as string | undefined,
      search: req.query['search'] as string | undefined,
      status: req.query['status'] as LibraryListQuery['status'],
    };
  }

  private getChangedBy(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }

  private resolveStatus(error: Error): number {
    return resolveErrorStatus(error, { ConflictError: 409, NotFoundError: 404, ValidationError: 400 }, 500);
  }
}
