import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import type { AuditService } from '../audit/audit.service';
import { FormulationRepository } from './formulation.repository';
import {
  normalizeFormulationInput,
  sumComponents,
  validateComponentTotal,
  validateFormulationInput,
} from './formulation.validator';
import type { FormulationListQuery, FormulationOptions, FormulationRecord } from './formulation.types';

export class FormulationService {
  constructor(
    private readonly repo: FormulationRepository,
    private readonly auditService: AuditService
  ) {}

  async list(query: FormulationListQuery): Promise<FormulationRecord[]> {
    return this.repo.list(query);
  }

  async options(): Promise<FormulationOptions> {
    return this.repo.options();
  }

  async detail(id: string): Promise<FormulationRecord> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundError(`Formulation ${id}`);
    record['auditHistory'] = await this.repo.audit(id);
    return record;
  }

  async create(input: Record<string, unknown>, changedBy: string): Promise<FormulationRecord> {
    const payload = normalizeFormulationInput(input);
    validateFormulationInput(payload);
    const warnings = await this.repo.validateReferences(payload.components, payload.targetBenchmarkId);
    if (payload.approve && warnings.length > 0) throw new ValidationError(warnings[0] ?? 'Invalid formulation references');

    const record = await this.repo.create(payload);
    await this.auditService.log({
      tableName: 'formulations',
      recordId: record.id,
      action: 'INSERT',
      changedBy,
      newValues: record,
    });
    if (payload.approve) {
      await this.auditService.log({
        tableName: 'formulations',
        recordId: record.id,
        action: 'UPDATE',
        changedBy,
        newValues: { status: 'approved' },
      });
    }
    return record;
  }

  async update(id: string, input: Record<string, unknown>, changedBy: string): Promise<FormulationRecord> {
    const before = await this.repo.findById(id);
    if (!before) throw new NotFoundError(`Formulation ${id}`);
    if (before['status'] !== 'draft') throw new ConflictError('Approved formulations are locked; duplicate a new version to change the recipe');

    const payload = normalizeFormulationInput(input);
    validateFormulationInput(payload);
    const warnings = await this.repo.validateReferences(payload.components, payload.targetBenchmarkId);
    if (payload.approve && warnings.length > 0) throw new ValidationError(warnings[0] ?? 'Invalid formulation references');

    let record = await this.repo.update(id, payload);
    if (!record) throw new NotFoundError(`Formulation ${id}`);

    if (payload.approve) {
      validateComponentTotal(payload.components);
      record = await this.repo.approve(id);
      if (!record) throw new NotFoundError(`Formulation ${id}`);
    }

    await this.auditService.log({
      tableName: 'formulations',
      recordId: id,
      action: 'UPDATE',
      changedBy,
      oldValues: before,
      newValues: record,
    });
    return record;
  }

  async approve(id: string, changedBy: string): Promise<FormulationRecord> {
    const before = await this.repo.findById(id);
    if (!before) throw new NotFoundError(`Formulation ${id}`);
    if (before['status'] !== 'draft') throw new ConflictError('Only draft formulations can be approved');

    const components = (before['components'] ?? []) as Array<{ percentComposition: number }>;
    validateComponentTotal(components.map((component) => ({
      basis: 'weight_percent',
      materialId: 'x',
      percentComposition: Number(component.percentComposition),
      supplierId: 'x',
    })));

    const record = await this.repo.approve(id);
    if (!record) throw new NotFoundError(`Formulation ${id}`);
    await this.auditService.log({
      tableName: 'formulations',
      recordId: id,
      action: 'UPDATE',
      changedBy,
      oldValues: before,
      newValues: record,
    });
    return record;
  }

  async archive(id: string, changedBy: string): Promise<FormulationRecord> {
    const before = await this.repo.findById(id);
    if (!before) throw new NotFoundError(`Formulation ${id}`);
    const record = await this.repo.archive(id);
    if (!record) throw new NotFoundError(`Formulation ${id}`);
    await this.auditService.log({
      tableName: 'formulations',
      recordId: id,
      action: 'UPDATE',
      changedBy,
      oldValues: before,
      newValues: record,
    });
    return record;
  }

  async duplicate(id: string, changedBy: string): Promise<FormulationRecord> {
    const source = await this.repo.findById(id);
    if (!source) throw new NotFoundError(`Formulation ${id}`);
    const record = await this.repo.duplicate(id);
    if (!record) throw new NotFoundError(`Formulation ${id}`);
    await this.auditService.log({
      tableName: 'formulations',
      recordId: record.id,
      action: 'INSERT',
      changedBy,
      oldValues: source,
      newValues: { ...record, duplicatedFrom: id },
    });
    return record;
  }

  componentTotal(record: FormulationRecord): number {
    return sumComponents(((record['components'] ?? []) as Array<{ percentComposition: number }>).map((component) => ({
      basis: 'weight_percent',
      materialId: 'x',
      percentComposition: Number(component.percentComposition),
      supplierId: 'x',
    })));
  }
}
