import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { ProcessSetupService } from './processSetup.service';

export class ProcessSetupController {
  constructor(private readonly service: ProcessSetupService) {}

  preview(req: Request, res: Response): void {
    const header = req.headers['x-file-name'];
    const encodedFilename = Array.isArray(header) ? header[0] ?? '' : header ?? '';
    let filename = encodedFilename;
    try { filename = decodeURIComponent(encodedFilename); } catch { filename = encodedFilename; }
    respondJson(res, () => this.service.preview(req.body as Buffer, filename, this.actor(req)), { successStatus: 201, errorStatus: this.status });
  }
  getImport(req: Request, res: Response): void { respondJson(res, () => this.service.getImport(req.params['id'] ?? ''), { errorStatus: this.status }); }
  commit(req: Request, res: Response): void { respondJson(res, () => this.service.commit(req.params['id'] ?? '', req.body as Record<string, unknown>, this.actor(req)), { successStatus: 201, errorStatus: this.status }); }
  list(req: Request, res: Response): void { void req; respondJson(res, () => this.service.listSetups(), { errorStatus: this.status }); }
  detail(req: Request, res: Response): void { respondJson(res, () => this.service.setupDetail(req.params['id'] ?? ''), { errorStatus: this.status }); }
  runDetail(req: Request, res: Response): void { respondJson(res, () => this.service.runProcessSetup(req.params['id'] ?? ''), { errorStatus: this.status }); }
  updateRunValues(req: Request, res: Response): void { respondJson(res, () => this.service.updateRunValues(req.params['id'] ?? '', req.body as Record<string, unknown>, this.actor(req)), { errorStatus: this.status }); }
  private actor(req: Request): string { return (req.headers['x-user-id'] as string) || 'anonymous'; }
  private status(error: Error): number { return resolveErrorStatus(error, { ConflictError: 409, NotFoundError: 404, ValidationError: 400 }, 500); }
}
