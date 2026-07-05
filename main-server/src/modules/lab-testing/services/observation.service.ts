import { ConflictError, NotFoundError, ValidationError } from '../../../errors/app-error';
import type { AuditService } from '../../audit/audit.service';
import type { LabTestingRepository } from '../repositories/labTesting.repository';
import type { ObservationRepository } from '../repositories/observation.repository';
import { normalizeObservationInput, validateObservationInput } from '../validators/observation.validator';
import type { LabTestingRecord } from '../labTesting.types';

export class ObservationService {
  constructor(
    private readonly repo: ObservationRepository,
    private readonly labRepo: LabTestingRepository,
    private readonly auditService: AuditService
  ) {}

  async create(input: Record<string, unknown>, changedBy: string): Promise<LabTestingRecord> {
    const payload = normalizeObservationInput(input);
    validateObservationInput(payload);
    await this.validateEditable(payload.sampleId, payload.auditReason);
    const record = await this.repo.create(payload);
    await this.auditService.log({ tableName: 'sample_observations', recordId: record.id, action: 'INSERT', changedBy, newValues: record });
    return record;
  }

  async update(id: string, input: Record<string, unknown>, changedBy: string): Promise<LabTestingRecord> {
    const before = await this.repo.findById(id);
    if (!before) throw new NotFoundError(`Observation ${id}`);
    const payload = normalizeObservationInput(input);
    validateObservationInput(payload);
    await this.validateEditable(payload.sampleId, payload.auditReason);
    const record = await this.repo.update(id, payload);
    if (!record) throw new NotFoundError(`Observation ${id}`);
    await this.auditService.log({ tableName: 'sample_observations', recordId: id, action: 'UPDATE', changedBy, oldValues: before, newValues: record });
    return record;
  }

  private async validateEditable(sampleId: string, auditReason?: string): Promise<void> {
    const status = await this.labRepo.runStatusForSample(sampleId);
    if (!status) throw new NotFoundError(`Sample ${sampleId}`);
    if (status === 'completed' && !auditReason) throw new ConflictError('Audit reason is required to edit completed observations');
    if (status !== 'testing' && status !== 'ready_for_testing' && status !== 'completed') {
      throw new ValidationError('Run must be ready for testing or testing to enter observations');
    }
  }
}
