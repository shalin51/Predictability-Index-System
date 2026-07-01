import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { BallTestingImportService } from './ball-testing-import.service';

export class BallTestingImportController {
  constructor(private readonly service: BallTestingImportService) {}

  importWorkbook(req: Request, res: Response): void {
    const importedBy = (req.headers['x-user-id'] as string) || 'anonymous';
    respondJson(res, () => this.service.importWorkbook(req.body as never, importedBy), {
      successStatus: 201,
      errorStatus: (error) => resolveErrorStatus(error, { ValidationError: 400 }, 500),
    });
  }
}
