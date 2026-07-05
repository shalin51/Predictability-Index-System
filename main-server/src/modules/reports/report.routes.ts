import { Router } from 'express';
import { ReportController } from './controllers/report.controller';

export function createReportRoutes(controller: ReportController) {
  const router = Router();

  router.get('/', (req, res) => controller.list(req, res));
  router.get('/runs/:runId', (req, res) => controller.latestForRun(req, res));
  router.post('/runs/:runId/generate', (req, res) => controller.generate(req, res));
  router.post('/runs/:runId/regenerate', (req, res) => controller.regenerate(req, res));
  router.get('/:reportId/export/pdf', (req, res) => controller.exportPdf(req, res));
  router.get('/:reportId/export/csv', (req, res) => controller.exportCsv(req, res));
  router.get('/:reportId', (req, res) => controller.detail(req, res));

  return router;
}
