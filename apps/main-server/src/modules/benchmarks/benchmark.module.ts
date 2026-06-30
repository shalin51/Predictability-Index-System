import { Router } from 'express';
import { BenchmarkRepository } from '../../infrastructure/repositories/benchmark.repository';
import { BenchmarkService } from './benchmark.service';
import { BenchmarkController } from './benchmark.controller';

export function createBenchmarkRouter() {
  const router = Router();
  const repo = new BenchmarkRepository();
  const service = new BenchmarkService(repo);
  const controller = new BenchmarkController(service);

  router.get('/', (req, res) => controller.list(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));
  router.get('/:id/metrics', (req, res) => controller.getMetrics(req, res));
  router.put('/:id/metrics/:metricName', (req, res) => controller.upsertMetric(req, res));
  router.get('/:id/metrics/validate-weights', (req, res) => controller.validateWeights(req, res));

  return router;
}
