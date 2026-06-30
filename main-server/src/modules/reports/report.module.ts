import { Router } from 'express';
import { ReportService } from './report.service';
import { FormulationRepository } from '../../infrastructure/repositories/formulation.repository';
import { BenchmarkRepository } from '../../infrastructure/repositories/benchmark.repository';
import { TestResultRepository } from '../../infrastructure/repositories/test-result.repository';
import { ReportController } from './report.controller';

export function createReportRouter() {
  const router = Router({ mergeParams: true });
  const formRepo = new FormulationRepository();
  const benchRepo = new BenchmarkRepository();
  const testRepo = new TestResultRepository();
  const service = new ReportService(formRepo, benchRepo, testRepo);
  const controller = new ReportController(service);

  router.get('/', (req, res) => controller.generate(req, res));

  return router;
}
