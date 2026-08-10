import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

export function createAuthRouter(): Router {
  const router = Router();
  const controller = new AuthController(new AuthService());
  router.post('/login', (req, res) => controller.login(req, res));
  return router;
}
