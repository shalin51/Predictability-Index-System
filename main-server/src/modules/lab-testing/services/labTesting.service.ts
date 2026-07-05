import { ConflictError, NotFoundError, ValidationError } from '../../../errors/app-error';
import type { AuditService } from '../../audit/audit.service';
import type { LabTestingRepository } from '../repositories/labTesting.repository';
import { normalizeQueueQuery } from '../validators/labTesting.validator';
import type { LabTestingRecord } from '../labTesting.types';

export class LabTestingService {
  constructor(
    private readonly repo: LabTestingRepository,
    private readonly auditService: AuditService
  ) {}

  async queue(query: Record<string, unknown>): Promise<LabTestingRecord[]> {
    return this.repo.queue(normalizeQueueQuery(query));
  }

  async run(runId: string): Promise<LabTestingRecord> {
    const record = await this.repo.run(runId);
    if (!record) throw new NotFoundError(`Lab testing run ${runId}`);
    return record;
  }

  async samples(runId: string): Promise<LabTestingRecord[]> {
    await this.run(runId);
    return this.repo.samples(runId);
  }

  async results(runId: string): Promise<LabTestingRecord> {
    await this.run(runId);
    return this.repo.results(runId);
  }

  async start(runId: string, changedBy: string): Promise<LabTestingRecord> {
    const before = await this.run(runId);
    if (before['status'] !== 'ready_for_testing' && before['status'] !== 'testing') {
      throw new ValidationError('Only ready for testing runs can start lab testing');
    }
    const record = await this.repo.updateRunStatus(runId, 'testing');
    if (!record) throw new NotFoundError(`Lab testing run ${runId}`);
    await this.auditService.log({
      tableName: 'production_runs',
      recordId: runId,
      action: 'UPDATE',
      changedBy,
      oldValues: before,
      newValues: record,
    });
    return record;
  }

  async complete(runId: string, changedBy: string): Promise<LabTestingRecord> {
    const before = await this.run(runId);
    if (before['status'] !== 'testing') throw new ValidationError('Run must be testing before completion');
    const missing = await this.repo.missingRequiredMetricCount(runId);
    if (missing > 0) throw new ConflictError(`Cannot complete testing with ${missing} required metrics missing`);
    const record = await this.repo.updateRunStatus(runId, 'completed');
    if (!record) throw new NotFoundError(`Lab testing run ${runId}`);
    await this.auditService.log({
      tableName: 'production_runs',
      recordId: runId,
      action: 'UPDATE',
      changedBy,
      oldValues: before,
      newValues: { ...record, summaryGenerationEnabled: true },
    });
    return record;
  }
}
