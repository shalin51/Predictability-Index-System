import { Router } from 'express';
import { TestResultRepository } from '../../infrastructure/repositories/test-result.repository';
import { FormulationRepository } from '../../infrastructure/repositories/formulation.repository';
import { AuditService } from '../audit/audit.service';
import { TestResultService } from './test-result.service';
import { TestResultController } from './test-result.controller';

export function createTestResultRouter() {
  const router = Router({ mergeParams: true });
  const repo = new TestResultRepository();
  const formRepo = new FormulationRepository();
  const audit = new AuditService();
  const service = new TestResultService(repo, formRepo, audit);
  const controller = new TestResultController(service);

  router.get('/', (req, res) => controller.getAllResults(req, res));
  router.get('/physical', (req, res) => controller.getPhysical(req, res));
  router.post('/physical', (req, res) => controller.upsertPhysical(req, res));
  router.get('/durability', (req, res) => controller.getDurability(req, res));
  router.post('/durability', (req, res) => controller.upsertDurability(req, res));
  router.get('/environmental', (req, res) => controller.getEnvironmental(req, res));
  router.post('/environmental', (req, res) => controller.upsertEnvironmental(req, res));
  router.get('/subjective', (req, res) => controller.getSubjective(req, res));
  router.post('/subjective', (req, res) => controller.upsertSubjective(req, res));

  return router;
}
