import { Router } from 'express';
import { FormulationRepository } from '../../infrastructure/repositories/formulation.repository';
import { TestResultRepository } from '../../infrastructure/repositories/test-result.repository';
import { BenchmarkRepository } from '../../infrastructure/repositories/benchmark.repository';
import { BenchmarkService } from '../benchmarks/benchmark.service';
import { AuditService } from '../audit/audit.service';
import { BallTestingImportService } from './ball-testing-import.service';
import { BallTestingImportController } from './ball-testing-import.controller';

export function createBallTestingImportRouter() {
  const router = Router();
  const formulationRepo = new FormulationRepository();
  const testResultRepo = new TestResultRepository();
  const benchmarkRepo = new BenchmarkRepository();
  const benchmarkService = new BenchmarkService(benchmarkRepo);
  const audit = new AuditService();
  const service = new BallTestingImportService(
    formulationRepo,
    testResultRepo,
    benchmarkRepo,
    benchmarkService,
    audit,
  );
  const controller = new BallTestingImportController(service);

  router.post('/ball-testing', (req, res) => controller.importWorkbook(req, res));

  return router;
}
