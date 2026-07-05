import { ConflictError, NotFoundError } from '../../errors/app-error';
import type { AuditService } from '../audit/audit.service';
import { SampleRepository } from './sample.repository';
import { buildSamples } from './sample.repository';
import { normalizeSampleInput, validateSampleInput } from './sample.validator';
import type { ProductionRunRecord, SampleGenerationInput } from './productionRun.types';

export class SampleService {
  constructor(
    private readonly repo: SampleRepository,
    private readonly auditService: AuditService
  ) {}

  async listByRun(productionRunId: string): Promise<ProductionRunRecord[]> {
    return this.repo.listByRun(productionRunId);
  }

  async generate(productionRunId: string, input: SampleGenerationInput, changedBy: string): Promise<ProductionRunRecord[]> {
    for (const sample of buildSamples(input)) {
      validateSampleInput(sample);
      if (await this.repo.existsByCode(sample.sampleCode)) throw new ConflictError(`Sample code ${sample.sampleCode} must be unique`);
    }
    const samples = await this.repo.generate(productionRunId, input);
    await this.auditService.log({
      tableName: 'production_runs',
      recordId: productionRunId,
      action: 'UPDATE',
      changedBy,
      newValues: { samplesGenerated: samples.length },
    });
    return samples;
  }

  async update(id: string, input: Record<string, unknown>, changedBy: string): Promise<ProductionRunRecord> {
    const payload = normalizeSampleInput(input);
    validateSampleInput(payload);
    if (await this.repo.existsByCode(payload.sampleCode, id)) throw new ConflictError('Sample code must be unique');
    const record = await this.repo.update(id, payload);
    if (!record) throw new NotFoundError(`Sample ${id}`);
    await this.auditService.log({
      tableName: 'samples',
      recordId: id,
      action: 'UPDATE',
      changedBy,
      newValues: record,
    });
    return record;
  }

  async archive(id: string, changedBy: string): Promise<ProductionRunRecord> {
    const record = await this.repo.archive(id);
    if (!record) throw new NotFoundError(`Sample ${id}`);
    await this.auditService.log({
      tableName: 'samples',
      recordId: id,
      action: 'UPDATE',
      changedBy,
      newValues: record,
    });
    return record;
  }
}
