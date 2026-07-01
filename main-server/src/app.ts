import express from 'express';
import type { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { createHealthRouter } from './modules/health/health.module';
import { createFormulationRouter } from './modules/formulations/formulation.module';
import { createTestResultRouter } from './modules/test-results/test-result.module';
import { createBenchmarkRouter } from './modules/benchmarks/benchmark.module';
import { createScoringRouter } from './modules/scoring/scoring.module';
import { createReportRouter } from './modules/reports/report.module';
import { createMlRouter } from './modules/ml/ml.module';
import { createVersionRouter } from './modules/version/version.module';
import { createBallTestingImportRouter } from './modules/imports/ball-testing-import.module';
import { requestLogger } from './middlewares/request-logger';
import { errorHandler } from './middlewares/error-handler';
import { authPlaceholder } from './middlewares/auth-placeholder';
import { apiVersion, requireApiVersion } from './middlewares/api-version';

export function createApp() {
  const app = express();
  registerCommonMiddleware(app);
  registerRoutes(app);
  registerFallbackHandlers(app);

  return app;
}

function registerCommonMiddleware(app: Express): void {
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);
  app.use(apiVersion);
  app.use(requireApiVersion);
  app.use(authPlaceholder);
}

function registerRoutes(app: Express): void {
  app.use('/health', createHealthRouter());
  app.use('/formulations', createFormulationRouter());
  app.use('/formulations/:id/results', createTestResultRouter());
  app.use('/benchmarks', createBenchmarkRouter());
  app.use('/formulations/:id/score', createScoringRouter());
  app.use('/formulations/:id/report', createReportRouter());
  app.use('/ml', createMlRouter());
  app.use('/version', createVersionRouter());
  app.use('/imports', createBallTestingImportRouter());
}

function registerFallbackHandlers(app: Express): void {
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
  });

  app.use(errorHandler);
}
