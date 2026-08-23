import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import { getPool } from '../../infrastructure/database/pg-pool';
import { formatCode } from '../../core/code-format';
import { COMPARISON_MODES, CRITICALITY_LEVELS, RECORD_STATUSES } from '../../constants/domain.constants';
import type { AuditService } from '../audit/audit.service';
import { getLibraryConfig } from './library.config';
import { LibraryRepository } from './library.repository';
import type { LibraryCollectionResponse, LibraryEntityConfig, LibraryListQuery, LibraryRecord } from './library.types';

const statuses = new Set<string>(RECORD_STATUSES);
const comparisonModes = new Set<string>(COMPARISON_MODES);
const criticalityLevels = new Set<string>(CRITICALITY_LEVELS);
const benchmarkMetricKeys = [
  'weight',
  'compression',
  'stretch',
  'full_stretch_max',
  'hardness',
  'wall_thickness',
  'diameter',
  'drop_test',
] as const;

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

  async detail(resource: string, id: string): Promise<{ data: LibraryRecord; fields: LibraryEntityConfig['createFields'] }> {
    const config = this.requireConfig(resource);
    const record = await this.repo.findById(config, id);
    if (!record) throw new NotFoundError(`${config.displayName} ${id}`);
    return { data: record, fields: config.createFields };
  }

  async options(resource: string): Promise<LibraryRecord[]> {
    return this.repo.options(resource);
  }

  async create(resource: string, input: Record<string, unknown>, changedBy: string): Promise<LibraryRecord> {
    const config = this.requireConfig(resource);
    this.validateWritable(config);
    let payload = this.preparePayload(resource, input);
    this.validateRequired(config.requiredFields, payload);
    await this.validateBenchmarkMetric(resource, payload['metricId']);
    payload = await this.enrichBenchmarkProperty(resource, payload, payload['metricId']);
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
    this.validateWritable(config);
    const before = await this.repo.rawById(config, id);
    if (!before) throw new NotFoundError(`${config.displayName} ${id}`);

    let payload = this.preparePayload(resource, input);
    await this.validateBenchmarkMetric(resource, payload['metricId'] ?? before['metric_id']);
    payload = await this.enrichBenchmarkProperty(resource, payload, payload['metricId'] ?? before['metric_id']);
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
    this.validateWritable(config);
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

  private validateWritable(config: LibraryEntityConfig): void {
    if (config.readOnly) throw new ValidationError(`${config.displayName} is read-only`);
  }

  private validateEnums(payload: Record<string, unknown>): void {
    if (payload['status'] != null && !statuses.has(String(payload['status']))) {
      throw new ValidationError('status must be active, inactive, or archived');
    }
    if (payload['comparisonMode'] != null && !comparisonModes.has(String(payload['comparisonMode']))) {
      throw new ValidationError('comparisonMode must be target_range, max_cap, or min_floor');
    }
    if (payload['criticality'] != null && !criticalityLevels.has(String(payload['criticality']))) {
      throw new ValidationError('criticality must be low, medium, high, or critical');
    }
  }

  private async validateBenchmarkMetric(resource: string, metricId: unknown): Promise<void> {
    if (resource !== 'scoring-rules') return;
    const result = await getPool().query(
      `SELECT 1
       FROM metric_definitions
       WHERE id = $1
         AND status = 'active'
         AND metric_key = ANY($2::text[])`,
      [metricId, benchmarkMetricKeys]
    );
    if ((result.rowCount ?? 0) === 0) {
      throw new ValidationError('Benchmark properties must use a supported Lab Testing metric');
    }
  }

  private async enrichBenchmarkProperty(resource: string, payload: Record<string, unknown>, metricId: unknown): Promise<Record<string, unknown>> {
    if (resource !== 'scoring-rules') return payload;
    const result = await getPool().query<{ metric_key: string; category: string; default_unit: string | null }>(
      `SELECT metric_key, category::text AS category, default_unit
       FROM metric_definitions
       WHERE id = $1`,
      [metricId]
    );
    const metric = result.rows[0];
    if (!metric) throw new ValidationError('Metric not found');
    return {
      ...payload,
      metricName: metric.metric_key,
      metricCategory: metric.category,
      unit: metric.default_unit,
    };
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

  private preparePayload(resource: string, input: Record<string, unknown>): Record<string, unknown> {
    const suffixByField: Record<string, { field: string; suffix: string }> = {
      benchmarks: { field: 'benchmarkCode', suffix: 'BN' },
      materials: { field: 'materialCode', suffix: 'M' },
      machines: { field: 'machineCode', suffix: 'MC' },
      molds: { field: 'moldCode', suffix: 'MD' },
      'test-conditions': { field: 'conditionCode', suffix: 'T' },
      'test-methods': { field: 'methodCode', suffix: 'T' },
    };
    const codeRule = suffixByField[resource];
    return {
      status: 'active',
      ...input,
      ...(codeRule && input[codeRule.field] !== undefined
        ? { [codeRule.field]: formatCode(String(input[codeRule.field]), codeRule.suffix) }
        : {}),
    };
  }
}
