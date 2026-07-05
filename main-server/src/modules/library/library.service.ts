import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import { getPool } from '../../infrastructure/database/pg-pool';
import type { AuditService } from '../audit/audit.service';
import { getLibraryConfig } from './library.config';
import { LibraryRepository } from './library.repository';
import type { LibraryCollectionResponse, LibraryListQuery, LibraryRecord } from './library.types';

const statuses = new Set(['active', 'inactive', 'archived']);

export class LibraryService {
  constructor(
    private readonly repo: LibraryRepository,
    private readonly auditService: AuditService
  ) {}

  async list(resource: string, query: LibraryListQuery): Promise<LibraryCollectionResponse> {
    const config = this.requireConfig(resource);
    return {
      data: await this.repo.list(config, query),
      fields: config.createFields,
    };
  }

  async options(resource: string): Promise<LibraryRecord[]> {
    return this.repo.options(resource);
  }

  async create(resource: string, input: Record<string, unknown>, changedBy: string): Promise<LibraryRecord> {
    const config = this.requireConfig(resource);
    const payload = this.preparePayload(input);
    this.validateRequired(config.requiredFields, payload);
    this.validateEnums(payload);
    await this.validateUnique(resource, payload);

    const record = await this.repo.create(config, payload);
    await this.auditService.log({
      tableName: config.tableName,
      recordId: record.id,
      action: 'INSERT',
      changedBy,
      newValues: record,
    });
    return record;
  }

  async update(resource: string, id: string, input: Record<string, unknown>, changedBy: string): Promise<LibraryRecord> {
    const config = this.requireConfig(resource);
    const before = await this.repo.rawById(config, id);
    if (!before) throw new NotFoundError(`${config.displayName} ${id}`);

    const payload = this.preparePayload(input);
    this.validateEnums(payload);
    await this.validateUnique(resource, { ...before, ...payload }, id);

    const record = await this.repo.update(config, id, payload);
    if (!record) throw new NotFoundError(`${config.displayName} ${id}`);

    await this.auditService.log({
      tableName: config.tableName,
      recordId: id,
      action: 'UPDATE',
      changedBy,
      oldValues: before,
      newValues: record,
    });
    return record;
  }

  async archive(resource: string, id: string, changedBy: string): Promise<LibraryRecord> {
    const config = this.requireConfig(resource);
    const before = await this.repo.rawById(config, id);
    if (!before) throw new NotFoundError(`${config.displayName} ${id}`);

    const record = await this.repo.archive(config, id);
    if (!record) throw new NotFoundError(`${config.displayName} ${id}`);

    await this.auditService.log({
      tableName: config.tableName,
      recordId: id,
      action: 'UPDATE',
      changedBy,
      oldValues: before,
      newValues: record,
    });
    return record;
  }

  async validateWeights(benchmarkId: string): Promise<{ valid: boolean; totalWeight: number; message: string }> {
    if (!benchmarkId) throw new ValidationError('benchmarkId is required');
    const result = await getPool().query<{ total_weight: string }>(
      `SELECT COALESCE(SUM(weight), 0)::text AS total_weight
       FROM benchmark_metric_targets
       WHERE benchmark_profile_id = $1 AND metric_id IS NOT NULL`,
      [benchmarkId]
    );
    const totalWeight = Number(result.rows[0]?.total_weight ?? 0);
    const valid = Math.abs(totalWeight - 1) <= 0.0001;
    return {
      valid,
      totalWeight,
      message: valid ? 'Scoring weights total 1.0' : `Scoring weights total ${totalWeight.toFixed(5)}; expected 1.0`,
    };
  }

  private requireConfig(resource: string) {
    const config = getLibraryConfig(resource);
    if (!config) throw new NotFoundError(`Library resource ${resource}`);
    return config;
  }

  private validateRequired(requiredFields: string[], payload: Record<string, unknown>): void {
    for (const field of requiredFields) {
      if (payload[field] === undefined || payload[field] === null || String(payload[field]).trim() === '') {
        throw new ValidationError(`${field} is required`);
      }
    }
  }

  private validateEnums(payload: Record<string, unknown>): void {
    if (payload['status'] != null && !statuses.has(String(payload['status']))) {
      throw new ValidationError('status must be active, inactive, or archived');
    }
  }

  private async validateUnique(resource: string, payload: Record<string, unknown>, excludeId?: string): Promise<void> {
    const config = this.requireConfig(resource);
    for (const check of config.uniqueChecks) {
      if (check.columns.some((column) => payload[column] === undefined)) {
        continue;
      }
      if (await this.repo.existsByColumns(config, check.columns, payload, excludeId)) {
        throw new ConflictError(check.message);
      }
    }
  }

  private preparePayload(input: Record<string, unknown>): Record<string, unknown> {
    return {
      status: 'active',
      ...input,
    };
  }
}
