import type { Request, Response } from 'express';
import { resolveErrorStatus } from '../../core/http';
import type { DataTransferService } from './dataTransfer.service';

export class DataTransferController {
  constructor(private readonly service: DataTransferService) {}

  export(req: Request, res: Response): void {
    this.sendWorkbook(req, res, 'export');
  }

  template(req: Request, res: Response): void {
    this.sendWorkbook(req, res, 'template');
  }

  import(req: Request, res: Response): void {
    void this.service.import(req.params['resource'] ?? '', req.body as Buffer, this.actor(req))
      .then((result) => res.status(200).json(result))
      .catch((error: Error) => res.status(this.status(error)).json({ error: error.message }));
  }

  private sendWorkbook(req: Request, res: Response, mode: 'export' | 'template'): void {
    void this.service.workbook(req.params['resource'] ?? '', mode)
      .then((file) => {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        res.status(200).send(file.body);
      })
      .catch((error: Error) => res.status(this.status(error)).json({ error: error.message }));
  }

  private actor(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'anonymous';
  }

  private status(error: Error): number {
    return resolveErrorStatus(error, { ConflictError: 409, NotFoundError: 404, ValidationError: 400 }, 500);
  }
}
