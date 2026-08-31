import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import type { AuditService } from '../audit/audit.service';
import type { PredictionClient } from './prediction.client';
import type { PredictionRepository } from './prediction.repository';
import type { PredictionRecord } from './prediction.types';

export class PredictionService {
  constructor(
    private readonly repository: PredictionRepository,
    private readonly client: PredictionClient,
    private readonly activeModelId: string,
    private readonly modelLabel: string,
    private readonly audit: AuditService,
    private readonly staleExecutionTimeoutMillis: number
  ) {}

  async listForRun(runId: string): Promise<PredictionRecord[]> {
    this.validateRunId(runId);
    const records = await this.repository.listForRun(runId);
    return records.map((record) => ({ ...record, modelLabel: this.modelLabel }));
  }

  async generate(runId: string, requestedBy: string, requestedModelId?: string): Promise<PredictionRecord> {
    this.validateRunId(runId);
    const modelId = requestedModelId?.trim() || this.activeModelId;
    if (!modelId) throw new ConflictError('No active prediction model is configured');
    this.validateUuid(modelId, 'Prediction model ID');
    const modelStatus = await this.repository.getModelStatus(modelId);
    if (modelStatus && modelStatus !== 'active') {
      throw new ConflictError('Prediction model is not active');
    }

    const input = await this.repository.inputForRun(runId);
    if (!input) throw new NotFoundError(`Production Run ${runId}`);
    const total = input.formula.components.reduce((sum, component) => sum + component.percent_composition, 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new ConflictError(`Formulation composition must total 100; received ${total}`);
    }

    const execution = await this.repository.start(runId, modelId, requestedBy, input, this.staleExecutionTimeoutMillis);
    let record: PredictionRecord;
    try {
      const response = await this.client.predict(modelId, input);
      if (response.model_id !== modelId) throw new ConflictError('Prediction processor returned an unexpected model');
      const entries = Object.entries(response.predictions);
      if (!entries.length || entries.some(([, value]) => !Number.isFinite(value))) {
        throw new ConflictError('Prediction processor returned invalid metrics');
      }
      record = await this.repository.complete(execution.id, response.predictions);
    } catch (error) {
      await this.repository.fail(execution.id, error instanceof Error ? error.message : 'Prediction failed');
      throw error;
    }
    try {
      await this.audit.log({
        action: 'INSERT',
        changedBy: requestedBy,
        newValues: { modelId, metricKeys: record.metrics.map((metric) => metric.metricKey) },
        recordId: record.id,
        tableName: 'prediction_results',
      });
    } catch (error) {
      // The prediction itself already succeeded and was persisted; an audit-log failure
      // must not be reported to the caller as a failed prediction (it would invite a
      // duplicate retry against the ML service).
      console.error('Failed to write audit log for prediction result', record.id, error);
    }
    return { ...record, modelLabel: this.modelLabel };
  }

  private validateRunId(runId: string): void {
    this.validateUuid(runId, 'Production run ID');
  }

  private validateUuid(value: string, label: string): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new ValidationError(`${label} is invalid`);
    }
  }
}
