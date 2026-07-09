import type { Request, Response } from 'express';
import { respondJson } from '../../../core/http';
import type { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  overview(_req: Request, res: Response): void {
    respondJson(res, () => this.service.overview());
  }

  summary(_req: Request, res: Response): void {
    respondJson(res, () => this.service.summary());
  }

  workflowStatus(_req: Request, res: Response): void {
    respondJson(res, () => this.service.workflowStatus());
  }

  labQueue(_req: Request, res: Response): void {
    respondJson(res, () => this.service.labQueue());
  }

  latestScores(_req: Request, res: Response): void {
    respondJson(res, () => this.service.latestScores());
  }

  riskAlerts(_req: Request, res: Response): void {
    respondJson(res, () => this.service.riskAlerts());
  }

  recentReports(_req: Request, res: Response): void {
    respondJson(res, () => this.service.recentReports());
  }

  benchmarkOverview(_req: Request, res: Response): void {
    respondJson(res, () => this.service.benchmarkOverview());
  }
}
