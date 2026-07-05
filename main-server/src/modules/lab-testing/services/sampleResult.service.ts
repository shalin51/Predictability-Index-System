import { ConflictError, NotFoundError, ValidationError } from '../../../errors/app-error';
import type { AuditService } from '../../audit/audit.service';
import type { LabTestingRepository } from '../repositories/labTesting.repository';
import type { SampleResultRepository } from '../repositories/sampleResult.repository';
import { normalizeSampleResultInput, validateSampleResultInput } from '../validators/sampleResult.validator';
import type { LabTestingRecord } from '../labTesting.types';

export class SampleResultService {
  constructor(
    private readonly repo: SampleResultRepository,
    private readonly labRepo: LabTestingRepository,
    private readonly auditService: AuditService
  ) {}

  async create(input: Record<string, unknown>, changedBy: string): Promise<LabTestingRecord> {
    const payload = normalizeSampleResultInput(input);
    validateSampleResultInput(payload);
    await this.validateEditable(payload.sampleId, payload.auditReason);
    const record = await this.repo.create(payload);
    await this.updateSampleStatus(payload.sampleId);
    await this.auditService.log({
      tableName: 'sample_test_results',
      recordId: record.id,
      action: 'INSERT',
      changedBy,
      newValues: record,
    });
    return record;
  }

  async update(id: string, input: Record<string, unknown>, changedBy: string): Promise<LabTestingRecord> {
    const before = await this.repo.findById(id);
    if (!before) throw new NotFoundError(`Sample result ${id}`);
    const payload = normalizeSampleResultInput(input);
    validateSampleResultInput(payload);
    await this.validateEditable(payload.sampleId, payload.auditReason);
    const record = await this.repo.update(id, payload);
    if (!record) throw new NotFoundError(`Sample result ${id}`);
    await this.updateSampleStatus(payload.sampleId);
    await this.auditService.log({
      tableName: 'sample_test_results',
      recordId: id,
      action: 'UPDATE',
      changedBy,
      oldValues: before,
      newValues: record,
    });
    return record;
  }

  private async validateEditable(sampleId: string, auditReason?: string): Promise<void> {
    const status = await this.labRepo.runStatusForSample(sampleId);
    if (!status) throw new NotFoundError(`Sample ${sampleId}`);
    if (status === 'completed' && !auditReason) throw new ConflictError('Audit reason is required to edit completed lab results');
    if (status !== 'testing' && status !== 'ready_for_testing' && status !== 'completed') {
      throw new ValidationError('Run must be ready for testing or testing to enter results');
    }
  }

  private async updateSampleStatus(sampleId: string): Promise<void> {
    await this.repo.updateSampleStatus(sampleId, await this.repo.sampleIsCompleted(sampleId) ? 'tested' : 'testing');
  }
}
