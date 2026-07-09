import { Router } from 'express';
import type { DashboardController } from './controllers/dashboard.controller';

export function createDashboardRoutes(controller: DashboardController) {
  const router = Router();

  router.get('/', (req, res) => controller.overview(req, res));
  router.get('/summary', (req, res) => controller.summary(req, res));
  router.get('/workflow-status', (req, res) => controller.workflowStatus(req, res));
  router.get('/lab-queue', (req, res) => controller.labQueue(req, res));
  router.get('/latest-scores', (req, res) => controller.latestScores(req, res));
  router.get('/risk-alerts', (req, res) => controller.riskAlerts(req, res));
  router.get('/recent-reports', (req, res) => controller.recentReports(req, res));
  router.get('/benchmark-overview', (req, res) => controller.benchmarkOverview(req, res));

  return router;
}
