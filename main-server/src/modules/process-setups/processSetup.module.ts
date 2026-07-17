import { Router } from 'express';
import { AuditService } from '../audit/audit.service';
import { ProcessSetupController } from './processSetup.controller';
import { ProcessSetupRepository } from './processSetup.repository';
import { ProcessSetupService } from './processSetup.service';
import { AzureSetupImportStorage } from './setupImport.storage';
import { SetupWorkbookParser } from './setupWorkbook.parser';

export function createProcessSetupController(): ProcessSetupController {
  return new ProcessSetupController(new ProcessSetupService(new ProcessSetupRepository(), new SetupWorkbookParser(), new AzureSetupImportStorage(), new AuditService()));
}

export function createSetupImportRouter() {
  const router = Router();
  const controller = createProcessSetupController();
  router.post('/preview', (req, res) => controller.preview(req, res));
  router.get('/:id', (req, res) => controller.getImport(req, res));
  router.post('/:id/commit', (req, res) => controller.commit(req, res));
  return router;
}

export function createProcessSetupRouter() {
  const router = Router();
  const controller = createProcessSetupController();
  router.get('/', (req, res) => controller.list(req, res));
  router.get('/:id', (req, res) => controller.detail(req, res));
  return router;
}

export function createProductionRunProcessSetupRouter() {
  const router = Router();
  const controller = createProcessSetupController();
  router.get('/:id/process-setup', (req, res) => controller.runDetail(req, res));
  router.patch('/:id/process-values', (req, res) => controller.updateRunValues(req, res));
  return router;
}
