import { Router } from 'express';
import { AuditService } from '../audit/audit.service';
import { FormulationController } from './formulation.controller';
import { FormulationRepository } from './formulation.repository';
import { FormulationService } from './formulation.service';

export function createFormulationRouter() {
  const router = Router();
  const controller = new FormulationController(new FormulationService(new FormulationRepository(), new AuditService()));

  router.get('/options', (req, res) => controller.options(req, res));
  router.get('/', (req, res) => controller.list(req, res));
  router.post('/', (req, res) => controller.create(req, res));
  router.get('/:id', (req, res) => controller.detail(req, res));
  router.put('/:id', (req, res) => controller.update(req, res));
  router.put('/:id/approve', (req, res) => controller.approve(req, res));
  router.put('/:id/archive', (req, res) => controller.archive(req, res));
  router.post('/:id/duplicate', (req, res) => controller.duplicate(req, res));

  return router;
}
