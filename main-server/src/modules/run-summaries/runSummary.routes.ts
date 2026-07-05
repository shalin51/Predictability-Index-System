import { Router } from 'express';
import { AuditService } from '../audit/audit.service';
import { RunSummaryController } from './controllers/runSummary.controller';
import { RunSummaryRepository } from './repositories/runSummary.repository';
import { RunSummaryService } from './services/runSummary.service';

export function createRunSummaryRouter() {
  const router = Router();
  const controller = new RunSummaryController(new RunSummaryService(new RunSummaryRepository(), new AuditService()));

  router.get('/runs/:runId', (req, res) => controller.detail(req, res));
  router.post('/runs/:runId/generate', (req, res) => controller.generate(req, res));
  router.post('/runs/:runId/regenerate', (req, res) => controller.regenerate(req, res));
  router.get('/runs/:runId/missing-required-metrics', (req, res) => controller.missingRequiredMetrics(req, res));

  return router;
}
