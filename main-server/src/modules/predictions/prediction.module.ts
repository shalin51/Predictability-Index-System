import { config } from '../../config/env';
import { AuditService } from '../audit/audit.service';
import { PredictionClient } from './prediction.client';
import { PredictionController } from './prediction.controller';
import { PredictionRepository } from './prediction.repository';
import { createPredictionRoutes } from './prediction.routes';
import { PredictionService } from './prediction.service';

export function createPredictionRouter() {
  const repository = new PredictionRepository();
  const client = new PredictionClient(config.prediction.baseUrl, config.prediction.timeoutMillis);
  const service = new PredictionService(
    repository,
    client,
    config.prediction.modelId,
    config.prediction.modelLabel,
    new AuditService(),
    config.prediction.staleExecutionTimeoutMillis
  );
  return createPredictionRoutes(new PredictionController(service));
}
