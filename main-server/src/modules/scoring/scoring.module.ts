import { Router } from 'express';
import { ScoringService } from './scoring.service';
import { FormulationRepository } from '../../infrastructure/repositories/formulation.repository';
import { BenchmarkRepository } from '../../infrastructure/repositories/benchmark.repository';
import { TestResultRepository } from '../../infrastructure/repositories/test-result.repository';
import { ScoringController } from './scoring.controller';

export function createScoringRouter() {
  const router = Router({ mergeParams: true });
  const formRepo = new FormulationRepository();
  const benchRepo = new BenchmarkRepository();
  const testRepo = new TestResultRepository();
  const service = new ScoringService(formRepo, benchRepo, testRepo);
  const controller = new ScoringController(service);

  router.post('/', (req, res) => controller.score(req, res));
  router.get('/all', (req, res) => controller.scoreAgainstAll(req, res));
  router.get('/summary', (req, res) => controller.summarize(req, res));

  return router;
}
