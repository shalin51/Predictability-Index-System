import { Router } from 'express';
import { MaterialCatalogController } from './materialCatalog.controller';
import { MaterialCatalogRepository } from './materialCatalog.repository';
import { MaterialCatalogService } from './materialCatalog.service';

export function createMaterialCatalogController(): MaterialCatalogController {
  return new MaterialCatalogController(new MaterialCatalogService(new MaterialCatalogRepository()));
}

export function createMaterialCatalogRouter() {
  const router = Router();
  const controller = createMaterialCatalogController();
  router.get('/:id', (req, res) => controller.detail(req, res));
  return router;
}
