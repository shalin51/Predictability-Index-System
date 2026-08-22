import { Router } from 'express';
import { AuditService } from '../audit/audit.service';
import { LibraryRepository } from '../library/library.repository';
import { LibraryService } from '../library/library.service';
import { DataTransferController } from './dataTransfer.controller';
import { DataTransferRepository } from './dataTransfer.repository';
import { DataTransferService } from './dataTransfer.service';

export function createDataTransferController(): DataTransferController {
  return new DataTransferController(
    new DataTransferService(new DataTransferRepository(), new LibraryService(new LibraryRepository(), new AuditService()))
  );
}

export function createDataTransferRouter() {
  const router = Router();
  const controller = createDataTransferController();
  router.get('/:resource/export', (req, res) => controller.export(req, res));
  router.get('/:resource/template', (req, res) => controller.template(req, res));
  router.post('/:resource/validate', (req, res) => controller.validate(req, res));
  router.post('/:resource/import', (req, res) => controller.import(req, res));
  return router;
}
