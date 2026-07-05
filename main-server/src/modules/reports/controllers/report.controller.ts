import type { Request, Response } from 'express';
import { respondJson, resolveErrorStatus } from '../../../core/http';
import type { ReportExportService } from '../services/reportExport.service';
import type { ReportService } from '../services/report.service';

export class ReportController {
  constructor(
    private readonly service: ReportService,
    private readonly exportService: ReportExportService
  ) {}

  list(req: Request, res: Response): void {
    respondJson(res, () => this.service.list({
      runId: req.query['runId'] as string | undefined,
      search: req.query['search'] as string | undefined,
      status: req.query['status'] as string | undefined,
    }), { errorStatus: this.resolveStatus });
  }

  detail(req: Request, res: Response): void {
    respondJson(res, () => this.service.detail(req.params['reportId'] ?? ''), { errorStatus: this.resolveStatus });
  }

  latestForRun(req: Request, res: Response): void {
    respondJson(res, () => this.service.latestForRun(req.params['runId'] ?? ''), { errorStatus: this.resolveStatus });
  }

  generate(req: Request, res: Response): void {
    respondJson(res, () => this.service.generate(req.params['runId'] ?? '', this.changedBy(req)), { errorStatus: this.resolveStatus });
  }

  regenerate(req: Request, res: Response): void {
    respondJson(res, () => this.service.regenerate(req.params['runId'] ?? '', this.changedBy(req)), { errorStatus: this.resolveStatus });
  }

  exportCsv(req: Request, res: Response): void {
    this.sendExport(res, () => this.exportService.csv(req.params['reportId'] ?? ''));
  }

  exportPdf(req: Request, res: Response): void {
    this.sendExport(res, () => this.exportService.pdf(req.params['reportId'] ?? ''));
  }

  private sendExport(res: Response, action: () => Promise<{ body: Buffer | string; contentType: string; filename: string }>): void {
    void action()
      .then((file) => {
        res.setHeader('Content-Type', file.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        res.status(200).send(file.body);
      })
      .catch((error: Error) => {
        res.status(this.resolveStatus(error)).json({ error: error.message });
      });
  }

  private changedBy(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }

  private resolveStatus(error: Error): number {
    return resolveErrorStatus(error, { ConflictError: 409, NotFoundError: 404, ValidationError: 400 }, 500);
  }
}
