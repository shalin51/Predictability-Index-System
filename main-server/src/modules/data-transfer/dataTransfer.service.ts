import { NotFoundError, ValidationError } from '../../errors/app-error';
import type { LibraryService } from '../library/library.service';
import type { LibraryRecord } from '../library/library.types';
import { getTransferDefinition } from './dataTransfer.config';
import { DataTransferRepository } from './dataTransfer.repository';
import type { TransferImportResult, TransferRows } from './dataTransfer.types';
import { createTransferWorkbook, parseTransferWorkbook } from './dataTransferWorkbook';

const libraryResources = new Set([
  'materials', 'material-suppliers', 'machines', 'machine-parameters', 'molds', 'mold-zones', 'benchmarks', 'scoring-rules',
]);

export class DataTransferService {
  constructor(
    private readonly repo: DataTransferRepository,
    private readonly libraryService: LibraryService
  ) {}

  async workbook(resource: string, mode: 'export' | 'template'): Promise<{ body: Buffer; filename: string }> {
    const definition = this.requireDefinition(resource);
    const rows = mode === 'template' ? {} : await this.exportRows(resource, definition.sheets[0]?.name ?? 'Data');
    const suffix = mode === 'template' ? 'import-template' : 'export';
    return { body: createTransferWorkbook(definition, rows), filename: `${definition.filename}-${suffix}.xlsx` };
  }

  async import(resource: string, bytes: Buffer, actor: string): Promise<TransferImportResult> {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new ValidationError('An XLSX workbook is required');
    const definition = this.requireDefinition(resource);
    const rows = parseTransferWorkbook(bytes, definition);
    if (resource === 'material-properties') return this.repo.importMaterialProperties(rows['Properties'] ?? [], actor, bytes);
    if (resource === 'formulations') return this.repo.importFormulations(rows);
    if (resource === 'production-runs') return this.repo.importProductionRuns(rows);
    if (resource === 'lab-results') return this.repo.importLabResults(rows);
    if (libraryResources.has(resource)) return this.importLibrary(resource, rows[definition.sheets[0]?.name ?? ''] ?? [], actor);
    throw new NotFoundError(`Data transfer resource ${resource}`);
  }

  private async exportRows(resource: string, sheetName: string): Promise<TransferRows> {
    if (!libraryResources.has(resource)) return this.repo.exportRows(resource);
    const response = await this.libraryService.list(resource, { status: 'all' });
    if (resource === 'scoring-rules') {
      const benchmarks = (await this.libraryService.list('benchmarks', { status: 'all' })).data;
      const versions = new Map(benchmarks.map((row) => [row.id, row['profileVersion']]));
      return { [sheetName]: response.data.map((row) => ({ ...row, profileVersion: versions.get(String(row['benchmarkProfileId'])) })) };
    }
    return { [sheetName]: response.data };
  }

  private async importLibrary(resource: string, rows: Array<Record<string, unknown>>, actor: string): Promise<TransferImportResult> {
    const current = (await this.libraryService.list(resource, { status: 'all' })).data;
    const references = await this.references(resource);
    const result: TransferImportResult = { created: 0, errors: [], processed: rows.length, skipped: 0, updated: 0 };
    for (const row of rows) {
      const payload = this.prepareLibraryPayload(resource, row, references);
      const match = current.find((record) => this.libraryIdentity(resource, record) === this.libraryIdentity(resource, { ...row, ...payload, id: '' }));
      if (match) {
        await this.libraryService.update(resource, match.id, payload, actor);
        result.updated += 1;
      } else {
        const created = await this.libraryService.create(resource, payload, actor);
        current.push({ ...row, ...payload, id: created.id });
        result.created += 1;
      }
    }
    return result;
  }

  private async references(resource: string): Promise<Record<string, LibraryRecord[]>> {
    const requested: string[] = [];
    if (resource === 'materials') requested.push('material-suppliers');
    if (resource === 'machine-parameters') requested.push('machines');
    if (resource === 'mold-zones') requested.push('molds');
    if (resource === 'scoring-rules') requested.push('benchmarks', 'metrics');
    const entries = await Promise.all(requested.map(async (key) => [key, (await this.libraryService.list(key, { status: 'all' })).data] as const));
    return Object.fromEntries(entries);
  }

  private prepareLibraryPayload(resource: string, row: Record<string, unknown>, refs: Record<string, LibraryRecord[]>): Record<string, unknown> {
    const payload = Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null && value !== ''));
    if (resource === 'materials' && row['materialSupplierCode']) {
      payload['materialSupplierId'] = this.referenceId(refs['material-suppliers'], 'supplierCode', row['materialSupplierCode']);
      delete payload['materialSupplierCode'];
    }
    if (resource === 'machine-parameters') {
      payload['machineId'] = this.referenceId(refs['machines'], 'machineCode', row['machineCode']);
      payload['positionType'] ??= 'single';
      delete payload['machineCode'];
    }
    if (resource === 'mold-zones') {
      payload['moldId'] = this.referenceId(refs['molds'], 'moldCode', row['moldCode']);
      payload['temperatureUnit'] ??= '°F';
      delete payload['moldCode'];
    }
    if (resource === 'scoring-rules') {
      const benchmark = refs['benchmarks']?.find((record) => record['benchmarkCode'] === row['benchmarkCode'] && Number(record['profileVersion']) === Number(row['profileVersion']));
      if (!benchmark) throw new ValidationError(`Unknown benchmark: ${row['benchmarkCode']} V${row['profileVersion']}`);
      payload['benchmarkProfileId'] = benchmark.id;
      payload['metricId'] = this.referenceId(refs['metrics'], 'metricKey', row['metricKey']);
      delete payload['benchmarkCode']; delete payload['profileVersion']; delete payload['metricKey'];
    }
    payload['status'] ??= 'active';
    return payload;
  }

  private referenceId(records: LibraryRecord[] | undefined, key: string, expected: unknown): string {
    const record = records?.find((item) => String(item[key]) === String(expected));
    if (!record) throw new ValidationError(`Unknown ${key}: ${expected}`);
    return record.id;
  }

  private libraryIdentity(resource: string, row: Record<string, unknown>): string {
    switch (resource) {
      case 'materials': return String(row['materialCode']);
      case 'material-suppliers': return String(row['supplierCode']);
      case 'machines': return String(row['machineCode']);
      case 'machine-parameters': return [row['machineCode'] ?? row['machineId'], row['parameterKey'], row['positionType'] ?? 'single', row['positionIndex'] ?? '', row['positionLabel'] ?? ''].join('|');
      case 'molds': return String(row['moldCode']);
      case 'mold-zones': return [row['moldCode'] ?? row['moldId'], row['zoneNumber']].join('|');
      case 'benchmarks': return [row['benchmarkCode'], row['profileVersion']].join('|');
      case 'scoring-rules': return [row['benchmarkProfileId'] ?? `${row['benchmarkCode']}|${row['profileVersion']}`, row['metricId'] ?? row['metricKey']].join('|');
      default: return '';
    }
  }

  private requireDefinition(resource: string) {
    const definition = getTransferDefinition(resource);
    if (!definition) throw new NotFoundError(`Data transfer resource ${resource}`);
    return definition;
  }
}
