import type { Request, Response } from 'express';
import { respondJson } from '../../core/http';
import type { MlService } from './ml.service';

export class MlController {
  constructor(private readonly service: MlService) {}

  exportData(_req: Request, res: Response): void {
    respondJson(res, () => this.service.exportData(), {
      unknownErrorMessage: 'Export failed',
    });
  }
}
