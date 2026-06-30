import { Router } from 'express';
import { VersionController } from './version.controller';
import { VersionService } from './version.service';

export function createVersionRouter() {
  const router = Router();
  const service = new VersionService();
  const controller = new VersionController(service);

  router.get('/', (req, res) => controller.getVersion(req, res));

  return router;
}
