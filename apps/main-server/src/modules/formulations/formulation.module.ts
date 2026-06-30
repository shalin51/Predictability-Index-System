import { Router } from 'express';
import { FormulationRepository } from '../../infrastructure/repositories/formulation.repository';
import { AuditService } from '../audit/audit.service';
import { FormulationService } from './formulation.service';
import { FormulationController } from './formulation.controller';

export function createFormulationRouter() {
  const router = Router();
  const repo = new FormulationRepository();
  const audit = new AuditService();
  const service = new FormulationService(repo, audit);
  const controller = new FormulationController(service);

  router.get('/', (req, res) => controller.list(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/', (req, res) => controller.create(req, res));
  router.put('/:id', (req, res) => controller.update(req, res));

  return router;
}
