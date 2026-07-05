import { ConflictError, NotFoundError, ValidationError } from '../../../errors/app-error';
import type { AuditService } from '../../audit/audit.service';
import type { LabTestingRepository } from '../repositories/labTesting.repository';
import type { SubjectiveRatingRepository } from '../repositories/subjectiveRating.repository';
import { normalizeSubjectiveRatingInput, validateSubjectiveRatingInput } from '../validators/sampleResult.validator';
import type { LabTestingRecord } from '../labTesting.types';

export class SubjectiveRatingService {
  constructor(
    private readonly repo: SubjectiveRatingRepository,
    private readonly labRepo: LabTestingRepository,
    private readonly auditService: AuditService
  ) {}

  async create(input: Record<string, unknown>, changedBy: string): Promise<LabTestingRecord> {
    const payload = normalizeSubjectiveRatingInput(input);
    validateSubjectiveRatingInput(payload);
    await this.validateEditable(payload.sampleId, payload.auditReason);
    const record = await this.repo.create(payload);
    await this.auditService.log({ tableName: 'sample_subjective_ratings', recordId: record.id, action: 'INSERT', changedBy, newValues: record });
    return record;
  }

  async update(id: string, input: Record<string, unknown>, changedBy: string): Promise<LabTestingRecord> {
    const before = await this.repo.findById(id);
    if (!before) throw new NotFoundError(`Subjective rating ${id}`);
    const payload = normalizeSubjectiveRatingInput(input);
    validateSubjectiveRatingInput(payload);
    await this.validateEditable(payload.sampleId, payload.auditReason);
    const record = await this.repo.update(id, payload);
    if (!record) throw new NotFoundError(`Subjective rating ${id}`);
    await this.auditService.log({ tableName: 'sample_subjective_ratings', recordId: id, action: 'UPDATE', changedBy, oldValues: before, newValues: record });
    return record;
  }

  private async validateEditable(sampleId: string, auditReason?: string): Promise<void> {
    const status = await this.labRepo.runStatusForSample(sampleId);
    if (!status) throw new NotFoundError(`Sample ${sampleId}`);
    if (status === 'completed' && !auditReason) throw new ConflictError('Audit reason is required to edit completed subjective ratings');
    if (status !== 'testing' && status !== 'ready_for_testing' && status !== 'completed') {
      throw new ValidationError('Run must be ready for testing or testing to enter subjective ratings');
    }
  }
}
