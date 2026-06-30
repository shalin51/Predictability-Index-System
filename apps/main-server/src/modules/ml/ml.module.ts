import { Router } from 'express';
import { MlController } from './ml.controller';
import { MlService } from './ml.service';

export function createMlRouter() {
  const router = Router();
  const service = new MlService();
  const controller = new MlController(service);

  router.get('/export', (req, res) => controller.exportData(req, res));

  return router;
}
