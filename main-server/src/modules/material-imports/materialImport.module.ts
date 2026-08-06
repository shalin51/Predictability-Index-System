import { Router } from 'express';
import { createSetupImportStorage } from '../process-setups/setupImport.storage';
import { MaterialImportController } from './materialImport.controller';
import { MaterialImportRepository } from './materialImport.repository';
import { MaterialImportService } from './materialImport.service';
import { MaterialWorkbookParser } from './materialWorkbook.parser';

export function createMaterialImportController(): MaterialImportController {
  return new MaterialImportController(new MaterialImportService(new MaterialImportRepository(), new MaterialWorkbookParser(), createSetupImportStorage()));
}

export function createMaterialImportRouter() {
  const router = Router();
  const controller = createMaterialImportController();
  router.post('/preview', (req, res) => controller.preview(req, res));
  router.get('/:id', (req, res) => controller.getImport(req, res));
  router.post('/:id/commit', (req, res) => controller.commit(req, res));
  return router;
}
