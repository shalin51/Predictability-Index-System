import type { Request, Response } from 'express';
import type { VersionService } from './version.service';

export class VersionController {
  constructor(private readonly service: VersionService) {}

  getVersion(_req: Request, res: Response): void {
    res.json(this.service.getVersion());
  }
}
