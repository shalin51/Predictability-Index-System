import { ConflictError, NotFoundError, ValidationError } from '../../../errors/app-error';
import type { AuditService } from '../../audit/audit.service';
import type { EnvironmentalResultRepository } from '../repositories/environmentalResult.repository';
import type { LabTestingRepository } from '../repositories/labTesting.repository';
import { normalizeEnvironmentalResultInput, validateSampleResultInput } from '../validators/sampleResult.validator';
import type { LabTestingRecord } from '../labTesting.types';

export class EnvironmentalResultService {
  constructor(
    private readonly repo: EnvironmentalResultRepository,
    private readonly labRepo: LabTestingRepository,
    private readonly auditService: AuditService
  ) {}

  async create(input: Record<string, unknown>, changedBy: string): Promise<LabTestingRecord> {
    const payload = normalizeEnvironmentalResultInput(input);
    validateSampleResultInput(payload);
    await this.validateEditable(payload.sampleId, payload.auditReason);
    const record = await this.repo.create(payload);
    await this.auditService.log({ tableName: 'environmental_test_results', recordId: record.id, action: 'INSERT', changedBy, newValues: record });
    return record;
  }

  async update(id: string, input: Record<string, unknown>, changedBy: string): Promise<LabTestingRecord> {
    const before = await this.repo.findById(id);
    if (!before) throw new NotFoundError(`Environmental result ${id}`);
    const payload = normalizeEnvironmentalResultInput(input);
    validateSampleResultInput(payload);
    await this.validateEditable(payload.sampleId, payload.auditReason);
    const record = await this.repo.update(id, payload);
    if (!record) throw new NotFoundError(`Environmental result ${id}`);
    await this.auditService.log({ tableName: 'environmental_test_results', recordId: id, action: 'UPDATE', changedBy, oldValues: before, newValues: record });
    return record;
  }

  private async validateEditable(sampleId: string, auditReason?: string): Promise<void> {
    const status = await this.labRepo.runStatusForSample(sampleId);
    if (!status) throw new NotFoundError(`Sample ${sampleId}`);
    if (status === 'completed' && !auditReason) throw new ConflictError('Audit reason is required to edit completed environmental results');
    if (status !== 'testing' && status !== 'ready_for_testing' && status !== 'completed') {
      throw new ValidationError('Run must be ready for testing or testing to enter environmental results');
    }
  }
}
