import { Router } from 'express';
import type { PredictionController } from './prediction.controller';

export function createPredictionRoutes(controller: PredictionController) {
  const router = Router();
  router.get('/runs/:runId', (req, res) => controller.listForRun(req, res));
  router.post('/runs/:runId/generate', (req, res) => controller.generate(req, res));
  return router;
}
