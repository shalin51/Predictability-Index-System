import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import type { AuditService } from '../audit/audit.service';
import { ProductionRunRepository } from './productionRun.repository';
import { SampleRepository, buildSamples } from './sample.repository';
import {
  nextProductionRunStatus,
  normalizeProductionRunInput,
  validateProductionRunInput,
} from './productionRun.validator';
import type { ProductionRunListQuery, ProductionRunRecord, ProductionRunStatus } from './productionRun.types';

export class ProductionRunService {
  constructor(
    private readonly repo: ProductionRunRepository,
    private readonly sampleRepo: SampleRepository,
    private readonly auditService: AuditService
  ) {}

  async list(query: ProductionRunListQuery): Promise<ProductionRunRecord[]> {
    return this.repo.list(query);
  }

  async approvedFormulations(): Promise<ProductionRunRecord[]> {
    return this.repo.approvedFormulationOptions();
  }

  async detail(id: string): Promise<ProductionRunRecord> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundError(`Production Run ${id}`);
    record['samples'] = await this.sampleRepo.listByRun(id);
    record['auditHistory'] = await this.repo.audit(id);
    return record;
  }

  async create(input: Record<string, unknown>, changedBy: string): Promise<ProductionRunRecord> {
    const payload = normalizeProductionRunInput(input);
    validateProductionRunInput(payload);
    await this.validateApprovedFormulation(payload.formulationId);
    await this.validateUniqueCodes(payload);

    const record = await this.repo.create(payload);
    await this.auditService.log({
      tableName: 'production_runs',
      recordId: record.id,
      action: 'INSERT',
      changedBy,
      newValues: record,
    });
    return this.detail(record.id);
  }

  async update(id: string, input: Record<string, unknown>, changedBy: string): Promise<ProductionRunRecord> {
    const before = await this.repo.findById(id);
    if (!before) throw new NotFoundError(`Production Run ${id}`);
    if (before['status'] === 'completed' || before['status'] === 'scored') {
      throw new ConflictError('Completed production runs are locked');
    }

    const payload = normalizeProductionRunInput(input);
    validateProductionRunInput(payload, true);
    if (payload.runCode && await this.repo.existsByRunCode(payload.runCode, id)) throw new ConflictError('Run code must be unique');
    if (before['status'] === 'testing' && !payload.auditReason) {
      throw new ValidationError('Audit reason is required to change manufacturing parameters after testing starts');
    }

    const record = await this.repo.update(id, payload);
    if (!record) throw new NotFoundError(`Production Run ${id}`);
    await this.auditService.log({
      tableName: 'production_runs',
      recordId: id,
      action: 'UPDATE',
      changedBy,
      oldValues: before,
      newValues: { ...record, auditReason: payload.auditReason || undefined },
    });
    return this.detail(id);
  }

  async updateStatus(id: string, status: ProductionRunStatus, changedBy: string): Promise<ProductionRunRecord> {
    const before = await this.repo.findById(id);
    if (!before) throw new NotFoundError(`Production Run ${id}`);
    nextProductionRunStatus(before['status'] as ProductionRunStatus, status);
    const record = await this.repo.updateStatus(id, status);
    if (!record) throw new NotFoundError(`Production Run ${id}`);
    await this.auditService.log({
      tableName: 'production_runs',
      recordId: id,
      action: 'UPDATE',
      changedBy,
      oldValues: before,
      newValues: record,
    });
    return this.detail(id);
  }

  async archive(id: string, changedBy: string): Promise<ProductionRunRecord> {
    const before = await this.repo.findById(id);
    if (!before) throw new NotFoundError(`Production Run ${id}`);
    const record = await this.repo.archive(id);
    if (!record) throw new NotFoundError(`Production Run ${id}`);
    await this.auditService.log({
      tableName: 'production_runs',
      recordId: id,
      action: 'UPDATE',
      changedBy,
      oldValues: before,
      newValues: record,
    });
    return record;
  }

  private async validateApprovedFormulation(formulationId: string): Promise<void> {
    const formulation = await this.repo.formulationOption(formulationId);
    if (!formulation) throw new NotFoundError(`Formulation ${formulationId}`);
    if (formulation['status'] !== 'approved') {
      throw new ValidationError('Only approved formulations can create production runs');
    }
  }

  private async validateUniqueCodes(payload: ReturnType<typeof normalizeProductionRunInput>): Promise<void> {
    if (payload.runCode && await this.repo.existsByRunCode(payload.runCode)) throw new ConflictError('Run code must be unique');
    if (!payload.sampleGeneration) return;
    for (const sample of buildSamples(payload.sampleGeneration)) {
      if (await this.sampleRepo.existsByCode(sample.sampleCode)) throw new ConflictError(`Sample code ${sample.sampleCode} must be unique`);
    }
  }
}
