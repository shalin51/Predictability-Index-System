import type { Request, Response } from 'express';
import { controllers } from './controllers';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  handler: (req: Request, res: Response) => void;
}

export const routes: RouteDefinition[] = [
  { method: 'GET', path: '/health', handler: (req, res) => controllers.health.getHealth(req, res) },
  { method: 'GET', path: '/health/db', handler: (req, res) => controllers.health.getDbHealth(req, res) },
  { method: 'GET', path: '/library/:resource/options', handler: (req, res) => controllers.library.options(req, res) },
  { method: 'GET', path: '/library/:resource', handler: (req, res) => controllers.library.list(req, res) },
  { method: 'POST', path: '/library/:resource', handler: (req, res) => controllers.library.create(req, res) },
  { method: 'PUT', path: '/library/:resource/:id', handler: (req, res) => controllers.library.update(req, res) },
  { method: 'PUT', path: '/library/:resource/:id/archive', handler: (req, res) => controllers.library.archive(req, res) },
  { method: 'GET', path: '/version', handler: (req, res) => controllers.version.getVersion(req, res) },
];
