import { Router } from 'express';
import { AuditService } from '../audit/audit.service';
import { ProductionRunController } from './productionRun.controller';
import { ProductionRunRepository } from './productionRun.repository';
import { ProductionRunService } from './productionRun.service';
import { SampleController } from './sample.controller';
import { SampleRepository } from './sample.repository';
import { SampleService } from './sample.service';

export function createProductionRunRouter() {
  const router = Router();
  const auditService = new AuditService();
  const sampleRepo = new SampleRepository();
  const controller = new ProductionRunController(new ProductionRunService(new ProductionRunRepository(), sampleRepo, auditService));
  const sampleController = new SampleController(new SampleService(sampleRepo, auditService));

  router.get('/approved-formulations', (req, res) => controller.approvedFormulations(req, res));
  router.get('/', (req, res) => controller.list(req, res));
  router.post('/', (req, res) => controller.create(req, res));
  router.get('/:id', (req, res) => controller.detail(req, res));
  router.patch('/:id', (req, res) => controller.update(req, res));
  router.post('/:id/archive', (req, res) => controller.archive(req, res));
  router.post('/:id/status', (req, res) => controller.updateStatus(req, res));
  router.get('/:id/samples', (req, res) => sampleController.listByRun(req, res));
  router.post('/:id/samples/generate', (req, res) => sampleController.generate(req, res));

  return router;
}

export function createSampleRouter() {
  const router = Router();
  const controller = new SampleController(new SampleService(new SampleRepository(), new AuditService()));

  router.patch('/:id', (req, res) => controller.update(req, res));
  router.post('/:id/archive', (req, res) => controller.archive(req, res));

  return router;
}
