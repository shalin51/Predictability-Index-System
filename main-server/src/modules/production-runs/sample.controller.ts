import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { SampleService } from './sample.service';
import type { SampleGenerationInput } from './productionRun.types';

export class SampleController {
  constructor(private readonly service: SampleService) {}

  listByRun(req: Request, res: Response): void {
    respondJson(res, () => this.service.listByRun(req.params['id'] ?? ''), { errorStatus: this.resolveStatus });
  }

  generate(req: Request, res: Response): void {
    respondJson(res, () => this.service.generate(req.params['id'] ?? '', req.body as SampleGenerationInput, this.getChangedBy(req)), {
      successStatus: 201,
      errorStatus: this.resolveStatus,
    });
  }

  update(req: Request, res: Response): void {
    respondJson(res, () => this.service.update(req.params['id'] ?? '', req.body as Record<string, unknown>, this.getChangedBy(req)), {
      errorStatus: this.resolveStatus,
    });
  }

  archive(req: Request, res: Response): void {
    respondJson(res, () => this.service.archive(req.params['id'] ?? '', this.getChangedBy(req)), { errorStatus: this.resolveStatus });
  }

  private getChangedBy(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }

  private resolveStatus(error: Error): number {
    return resolveErrorStatus(error, { ConflictError: 409, NotFoundError: 404, ValidationError: 400 }, 500);
  }
}
