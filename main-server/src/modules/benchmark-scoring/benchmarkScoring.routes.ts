import { Router } from 'express';
import { AuditService } from '../audit/audit.service';
import { BenchmarkScoringController } from './controllers/benchmarkScoring.controller';
import { BenchmarkScoringRepository } from './repositories/benchmarkScoring.repository';
import { BenchmarkScoringService } from './services/benchmarkScoring.service';
import { PerformanceDistanceService } from './services/performanceDistance.service';

export function createBenchmarkScoringRouter() {
  const router = Router();
  const controller = new BenchmarkScoringController(
    new BenchmarkScoringService(
      new BenchmarkScoringRepository(),
      new PerformanceDistanceService(),
      new AuditService()
    )
  );

  router.get('/runs/:runId', (req, res) => controller.runScores(req, res));
  router.post('/runs/:runId/generate', (req, res) => controller.generate(req, res));
  router.post('/runs/:runId/regenerate', (req, res) => controller.regenerate(req, res));
  router.get('/runs/:runId/compare', (req, res) => controller.compare(req, res));
  router.get('/reports/:scoreReportId', (req, res) => controller.report(req, res));

  return router;
}
