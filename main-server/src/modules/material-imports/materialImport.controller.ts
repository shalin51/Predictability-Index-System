import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../core/http';
import type { MaterialImportService } from './materialImport.service';

export class MaterialImportController {
  constructor(private readonly service: MaterialImportService) {}

  preview(req: Request, res: Response): void {
    const header = req.headers['x-file-name'];
    const encoded = Array.isArray(header) ? header[0] ?? '' : header ?? '';
    let filename = encoded;
    try { filename = decodeURIComponent(encoded); } catch { filename = encoded; }
    respondJson(res, () => this.service.preview(req.body as Buffer, filename, this.actor(req)), { successStatus: 201, errorStatus: this.status });
  }

  getImport(req: Request, res: Response): void {
    respondJson(res, () => this.service.getImport(req.params['id'] ?? ''), { errorStatus: this.status });
  }

  commit(req: Request, res: Response): void {
    respondJson(res, () => this.service.commit(req.params['id'] ?? '', req.body as Record<string, unknown>, this.actor(req)), { successStatus: 201, errorStatus: this.status });
  }

  private actor(req: Request): string { return (req.headers['x-user-id'] as string) || 'anonymous'; }
  private status(error: Error): number { return resolveErrorStatus(error, { ConflictError: 409, NotFoundError: 404, ValidationError: 400 }, 500); }
}
