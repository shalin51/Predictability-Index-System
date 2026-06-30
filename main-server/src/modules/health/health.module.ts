import { Router } from 'express';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

export function createHealthRouter() {
  const router = Router();
  const healthService = new HealthService();
  const healthController = new HealthController(healthService);

  router.get('/', (req, res) => healthController.getHealth(req, res));
  router.get('/db', (req, res) => healthController.getDbHealth(req, res));

  return router;
}
