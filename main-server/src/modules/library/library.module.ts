import { Router } from 'express';
import { AuditService } from '../audit/audit.service';
import { LibraryController } from './library.controller';
import { LibraryRepository } from './library.repository';
import { LibraryService } from './library.service';

export function createLibraryRouter() {
  const router = Router();
  const controller = new LibraryController(new LibraryService(new LibraryRepository(), new AuditService()));

  router.get('/scoring-rules/validate-weights', (req, res) => controller.validateWeights(req, res));
  router.get('/:resource/options', (req, res) => controller.options(req, res));
  router.get('/:resource', (req, res) => controller.list(req, res));
  router.post('/:resource', (req, res) => controller.create(req, res));
  router.put('/:resource/:id', (req, res) => controller.update(req, res));
  router.put('/:resource/:id/archive', (req, res) => controller.archive(req, res));

  return router;
}
