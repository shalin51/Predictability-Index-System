import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { TestResultService } from './test-result.service';

export class TestResultController {
  constructor(private readonly service: TestResultService) {}

  getAllResults(req: Request, res: Response): void {
    respondJson(res, () => this.service.getAllResults(this.getFormulationId(req)), {
      errorStatus: (error) => this.resolveStatus(error),
    });
  }

  getPhysical(req: Request, res: Response): void {
    respondJson(res, () => this.service.getTestResult(this.getFormulationId(req)), {
      errorStatus: (error) => this.resolveStatus(error),
    });
  }

  upsertPhysical(req: Request, res: Response): void {
    respondJson(
      res,
      () => this.service.upsertTestResult(this.getFormulationId(req), req.body as never, this.getUser(req)),
      {
        successStatus: 201,
        errorStatus: (error) => this.resolveStatus(error),
      }
    );
  }

  getDurability(req: Request, res: Response): void {
    respondJson(res, () => this.service.getDurability(this.getFormulationId(req)), {
      errorStatus: (error) => this.resolveStatus(error),
    });
  }

  upsertDurability(req: Request, res: Response): void {
    respondJson(
      res,
      () => this.service.upsertDurability(this.getFormulationId(req), req.body as never, this.getUser(req)),
      {
        successStatus: 201,
        errorStatus: (error) => this.resolveStatus(error),
      }
    );
  }

  getEnvironmental(req: Request, res: Response): void {
    respondJson(res, () => this.service.getEnvironmental(this.getFormulationId(req)), {
      errorStatus: (error) => this.resolveStatus(error),
    });
  }

  upsertEnvironmental(req: Request, res: Response): void {
    respondJson(
      res,
      () => this.service.upsertEnvironmental(this.getFormulationId(req), req.body as never, this.getUser(req)),
      {
        successStatus: 201,
        errorStatus: (error) => this.resolveStatus(error),
      }
    );
  }

  getSubjective(req: Request, res: Response): void {
    respondJson(res, () => this.service.getSubjective(this.getFormulationId(req)), {
      errorStatus: (error) => this.resolveStatus(error),
    });
  }

  upsertSubjective(req: Request, res: Response): void {
    respondJson(
      res,
      () => this.service.upsertSubjective(this.getFormulationId(req), req.body as never, this.getUser(req)),
      {
        successStatus: 201,
        errorStatus: (error) => this.resolveStatus(error),
      }
    );
  }

  private getFormulationId(req: Request): string {
    return req.params['id'] ?? '';
  }

  private getUser(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }

  private resolveStatus(error: Error): number {
    return resolveErrorStatus(error, { NotFoundError: 404, ValidationError: 400 }, 500);
  }
}
