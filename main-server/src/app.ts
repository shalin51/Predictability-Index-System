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
import { createDashboardRouter } from './modules/dashboard/dashboard.module';
import { requestLogger } from './middlewares/request-logger';
import { errorHandler } from './middlewares/error-handler';
import { authPlaceholder } from './middlewares/auth-placeholder';
import { apiVersion, requireApiVersion } from './middlewares/api-version';
import {
  createProcessSetupRouter,
  createProductionRunProcessSetupRouter,
  createSetupImportRouter,
} from './modules/process-setups/processSetup.module';

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
  app.use('/setup-sheet-imports/preview', (req, res, next) => {
    const contentType = req.headers['content-type']?.toLowerCase() ?? '';
    if (req.method === 'POST' && !contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') && !contentType.includes('application/octet-stream')) {
      res.status(415).json({ error: 'Unsupported workbook content type', code: 'UNSUPPORTED_MEDIA_TYPE' });
      return;
    }
    next();
  });
  app.use(
    '/setup-sheet-imports/preview',
    express.raw({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream',
      ],
      limit: '10mb',
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
  app.use('/dashboard', createDashboardRouter());
  app.use('/library', createLibraryRouter());
  app.use('/formulations', createFormulationRouter());
  app.use('/setup-sheet-imports', createSetupImportRouter());
  app.use('/process-setups', createProcessSetupRouter());
  app.use('/production-runs', createProductionRunProcessSetupRouter());
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
