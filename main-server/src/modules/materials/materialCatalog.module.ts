import { Router } from 'express';
import { MaterialCatalogController } from './materialCatalog.controller';
import { MaterialCatalogRepository } from './materialCatalog.repository';
import { MaterialCatalogService } from './materialCatalog.service';
import { AuditService } from '../audit/audit.service';

export function createMaterialCatalogController(): MaterialCatalogController {
  return new MaterialCatalogController(new MaterialCatalogService(new MaterialCatalogRepository(), new AuditService()));
}

export function createMaterialCatalogRouter() {
  const router = Router();
  const controller = createMaterialCatalogController();
  router.post('/property-definitions', (req, res) => controller.createPropertyDefinition(req, res));
  router.get('/:id/property-options', (req, res) => controller.propertyOptions(req, res));
  router.post('/:id/properties', (req, res) => controller.createProperty(req, res));
  router.put('/:id/properties/:propertyFactId', (req, res) => controller.updateProperty(req, res));
  router.get('/:id', (req, res) => controller.detail(req, res));
  return router;
}
