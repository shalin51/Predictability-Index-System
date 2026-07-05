import express from 'express';
import type { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { createHealthRouter } from './modules/health/health.module';
import { createBenchmarkScoringRouter } from './modules/benchmark-scoring/benchmarkScoring.module';
import { createVersionRouter } from './modules/version/version.module';
import { createLibraryRouter } from './modules/library/library.module';
import { createFormulationRouter } from './modules/formulations/formulation.module';
import { createLabTestingRouter } from './modules/lab-testing/labTesting.module';
import { createProductionRunRouter, createSampleRouter } from './modules/production-runs/productionRun.module';
import { createRunSummaryRouter } from './modules/run-summaries/runSummary.module';
import { createReportRouter } from './modules/reports/report.module';
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
  app.use('/version', createVersionRouter());
  app.use('/library', createLibraryRouter());
  app.use('/formulations', createFormulationRouter());
  app.use('/production-runs', createProductionRunRouter());
  app.use('/samples', createSampleRouter());
  app.use('/lab-testing', createLabTestingRouter());
  app.use('/run-summaries', createRunSummaryRouter());
  app.use('/benchmark-scoring', createBenchmarkScoringRouter());
  app.use('/reports', createReportRouter());
}

function registerFallbackHandlers(app: Express): void {
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
  });

  app.use(errorHandler);
}
