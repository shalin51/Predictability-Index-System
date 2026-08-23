import { NotFoundError, ValidationError } from '../../errors/app-error';
import type { LibraryService } from '../library/library.service';
import type { LibraryRecord } from '../library/library.types';
import { getTransferDefinition } from './dataTransfer.config';
import { DataTransferRepository } from './dataTransfer.repository';
import type { DataTransferValidationResponse, DuplicateResolution, RowValidationResult, TransferDefinition, TransferImportResult, TransferRows } from './dataTransfer.types';
import { createTransferWorkbook, parseTransferWorkbook, parseTransferWorkbookSafe } from './dataTransferWorkbook';
import type { ParsedRowResult } from './dataTransferWorkbook';

const libraryResources = new Set([
  'materials', 'material-suppliers', 'machines', 'molds', 'benchmarks', 'machine-setup-profiles', 'scoring-profiles',
]);

const repoBackedResources = new Set([
  'machines', 'molds', 'benchmarks', 'formulations', 'production-runs', 'lab-results', 'machine-setup-profiles', 'scoring-profiles', 'testing',
]);

export class DataTransferService {
  constructor(
    private readonly repo: DataTransferRepository,
    private readonly libraryService: LibraryService
  ) {}

  async workbook(resource: string, mode: 'export' | 'template'): Promise<{ body: Buffer; filename: string }> {
    const definition = this.requireDefinition(resource);
    const rows = mode === 'template' ? {} : await this.exportRows(resource, definition);
    const suffix = mode === 'template' ? 'import-template' : 'export';
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return { body: createTransferWorkbook(definition, rows), filename: `${definition.filename}-${suffix}-${ts}.xlsx` };
  }

  async import(resource: string, bytes: Buffer, actor: string, resolutions: DuplicateResolution[] = []): Promise<TransferImportResult> {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new ValidationError('An XLSX workbook is required');
    const definition = this.requireDefinition(resource);
    const rows = parseTransferWorkbook(bytes, definition);
    if (resource === 'material-properties') return this.repo.importMaterialProperties(rows['Properties'] ?? [], actor, bytes);
    if (resource === 'machines') return this.repo.importMachinesWithParameters(rows);
    if (resource === 'molds') return this.repo.importMoldsWithZones(rows);
    if (resource === 'benchmarks') return this.repo.importBenchmarksWithProperties(rows);
    if (resource === 'formulations') return this.repo.importFormulations(rows);
    if (resource === 'production-runs') return this.repo.importProductionRuns(rows);
    if (resource === 'machine-setup-profiles') return this.repo.importMachineSetupProfiles(rows);
    if (resource === 'scoring-profiles') return this.repo.importScoringProfiles(rows);
    if (resource === 'testing') return this.repo.importTesting(rows);
    if (resource === 'lab-results') return this.repo.importLabResults(rows);
    if (libraryResources.has(resource)) return this.importLibrary(resource, rows[definition.sheets[0]?.name ?? ''] ?? [], actor, resolutions);
    throw new NotFoundError(`Data transfer resource ${resource}`);
  }

  async validate(resource: string, bytes: Buffer): Promise<DataTransferValidationResponse> {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
      return { resource, canImport: false, rows: [], summary: { create: 0, update: 0, error: 0 }, totalErrors: 1 };
    }
    const definition = this.requireDefinition(resource);
    const parsed = parseTransferWorkbookSafe(bytes, definition);
    if (parsed.structuralError) {
      return { resource, canImport: false, rows: [{ rowIndex: -1, data: {}, errors: [parsed.structuralError], action: 'error' }], summary: { create: 0, update: 0, error: 1 }, totalErrors: 1 };
    }

    if (resource === 'machines') {
      const current = await this.repo.exportRows(resource);
      const machines = parsed.sheetRows['Machines'] ?? [];
      const parameters = parsed.sheetRows['Machine Parameters'] ?? [];
      const machineRefs = [...(current['Machines'] ?? []), ...machines.map((row) => row.data)];
      const rows = [
        ...this.validateParsedRows('machines', machines, current['Machines'] ?? []),
        ...this.validateParsedRows('machine-parameters', parameters, current['Machine Parameters'] ?? [], { machines: machineRefs }),
      ];
      return this.buildValidationResponse(resource, rows);
    }

    if (resource === 'molds') {
      const current = await this.repo.exportRows(resource);
      const molds = parsed.sheetRows['Molds'] ?? [];
      const zones = parsed.sheetRows['Mold Zones'] ?? [];
      const moldRefs = [...(current['Molds'] ?? []), ...molds.map((row) => row.data)];
      const rows = [
        ...this.validateParsedRows('molds', molds, current['Molds'] ?? []),
        ...this.validateParsedRows('mold-zones', zones, current['Mold Zones'] ?? [], { molds: moldRefs }),
      ];
      return this.buildValidationResponse(resource, rows);
    }

    if (resource === 'benchmarks') {
      const [current, refs] = await Promise.all([this.repo.exportRows(resource), this.references('scoring-rules')]);
      const benchmarks = parsed.sheetRows['Benchmarks'] ?? [];
      const properties = parsed.sheetRows['Benchmark Properties'] ?? [];
      const benchmarkRefs = [...(current['Benchmarks'] ?? []), ...benchmarks.map((row) => row.data)];
      const rows = [
        ...this.validateParsedRows('benchmarks', benchmarks, current['Benchmarks'] ?? []),
        ...this.validateParsedRows('scoring-rules', properties, current['Benchmark Properties'] ?? [], { ...refs, benchmarks: benchmarkRefs }),
      ];
      return this.buildValidationResponse(resource, rows);
    }

    const sheetName = definition.sheets[0]?.name ?? '';
    const sheetRows = parsed.sheetRows[sheetName] ?? [];

    if (resource === 'machine-setup-profiles' || resource === 'scoring-profiles' || resource === 'testing') {
      const [currentRows, refs] = await Promise.all([
        this.exportRows(resource, definition).then((rows) => rows[sheetName] ?? []),
        resource === 'machine-setup-profiles' || resource === 'scoring-profiles' ? this.references(resource) : Promise.resolve({}),
      ]);
      return this.buildValidationResponse(resource, this.validateParsedRows(resource, sheetRows, currentRows, refs));
    }

    const needsMaterialRef = resource === 'material-properties';
    const isLibraryResource = libraryResources.has(resource);
    const refs = isLibraryResource ? await this.references(resource) : {};
    const materialRef = needsMaterialRef ? (await this.libraryService.list('materials', { status: 'all' })).data : [];
    const current = isLibraryResource ? (await this.libraryService.list(resource, { status: 'all' })).data : [];
    return this.buildValidationResponse(resource, this.validateParsedRows(resource, sheetRows, current, refs, materialRef));
  }

  private buildValidationResponse(resource: string, rows: RowValidationResult[]): DataTransferValidationResponse {
    const totalErrors = rows.filter((row) => row.action === 'error').length;
    return {
      resource,
      canImport: totalErrors === 0 && rows.length > 0,
      rows,
      summary: { create: rows.filter((row) => row.action === 'create').length, update: rows.filter((row) => row.action === 'update').length, error: totalErrors },
      totalErrors,
    };
  }

  private validateParsedRows(
    resource: string,
    parsedRows: ParsedRowResult[],
    current: Array<Record<string, unknown>>,
    refs: Record<string, Array<Record<string, unknown>>> = {},
    materialRef: Array<Record<string, unknown>> = []
  ): RowValidationResult[] {
    const rows: RowValidationResult[] = [];
    const seenIdentities = new Set<string>();

    for (const parsed of parsedRows) {
      const errors = [...parsed.parseErrors];
      const resolvedData = { ...parsed.data };

      if (errors.length === 0) {
        if (resource === 'materials' && parsed.data['materialSupplierCode']) {
          const suppliers = refs['material-suppliers'] ?? [];
          const found = suppliers.find((record) => String(record['supplierCode']) === String(parsed.data['materialSupplierCode']));
          if (!found) errors.push(`Supplier "${parsed.data['materialSupplierCode']}" not found — import it first via Imports → Material Suppliers`);
          else resolvedData['materialSupplierId'] = found.id;
        }
        if (resource === 'machine-parameters') {
          const machines = refs['machines'] ?? [];
          const found = machines.find((record) => String(record['machineCode']) === String(parsed.data['machineCode']));
          if (!found) errors.push(`Machine "${parsed.data['machineCode']}" not found — import it first via Imports → Machines`);
          else resolvedData['machineId'] = found.id ?? parsed.data['machineCode'];
        }
        if (resource === 'mold-zones') {
          const molds = refs['molds'] ?? [];
          const found = molds.find((record) => String(record['moldCode']) === String(parsed.data['moldCode']));
          if (!found) errors.push(`Mold "${parsed.data['moldCode']}" not found — import it first via Imports → Molds`);
          else resolvedData['moldId'] = found.id ?? parsed.data['moldCode'];
        }
        if (resource === 'scoring-rules') {
          const benchmarks = refs['benchmarks'] ?? [];
          const found = benchmarks.find((record) => String(record['benchmarkCode']) === String(parsed.data['benchmarkCode']) && Number(record['profileVersion']) === Number(parsed.data['profileVersion']));
          if (!found) errors.push(`Benchmark "${parsed.data['benchmarkCode']} V${parsed.data['profileVersion']}" not found — import it first via Imports → Benchmarks`);
          else resolvedData['benchmarkProfileId'] = found.id ?? `${parsed.data['benchmarkCode']}|${parsed.data['profileVersion']}`;
          const metrics = refs['metrics'] ?? [];
          const metric = metrics.find((record) => String(record['metricKey']) === String(parsed.data['metricKey']));
          if (!metric) errors.push(`Metric "${parsed.data['metricKey']}" not found in system metrics`);
          else resolvedData['metricId'] = metric.id ?? parsed.data['metricKey'];
        }
        if (resource === 'machine-setup-profiles') {
          const machines = refs['machines'] ?? [];
          const found = machines.find((record) => String(record['machineCode']) === String(parsed.data['machineCode']));
          if (!found) errors.push(`Machine "${parsed.data['machineCode']}" not found — import it first via Imports → Machines`);
          else resolvedData['machineId'] = found.id ?? parsed.data['machineCode'];
        }
        if (resource === 'scoring-profiles') {
          const metrics = refs['metrics'] ?? [];
          const metric = metrics.find((record) => String(record['metricKey']) === String(parsed.data['metricKey']));
          if (!metric) errors.push(`Metric "${parsed.data['metricKey']}" not found in system metrics`);
          else resolvedData['metricId'] = metric.id ?? parsed.data['metricKey'];
        }
      }

      if (errors.length === 0 && resource === 'material-properties' && parsed.data['materialCode']) {
        const found = materialRef.find((record) => String(record['materialCode']) === String(parsed.data['materialCode']));
        if (!found) errors.push(`Material "${parsed.data['materialCode']}" not found — import it first via Imports → Materials`);
      }

      const identity = this.libraryIdentity(resource, resolvedData);
      if (identity && seenIdentities.has(identity)) {
        errors.push('Duplicate row: this record appears more than once in the file');
      } else if (identity) {
        seenIdentities.add(identity);
      }

      const existingMatch = errors.length === 0 && identity
        ? current.find((record) => this.libraryIdentity(resource, record) === identity)
        : undefined;
      const action: RowValidationResult['action'] = errors.length > 0 ? 'error' : existingMatch ? 'update' : 'create';
      rows.push({ rowIndex: parsed.rowIndex, data: parsed.data, errors, action, existingRecord: existingMatch ?? undefined });
    }

    return rows;
  }

  private async exportRows(resource: string, definition: TransferDefinition): Promise<TransferRows> {
    if (repoBackedResources.has(resource)) return this.repo.exportRows(resource);
    if (!libraryResources.has(resource)) return this.repo.exportRows(resource);
    const response = await this.libraryService.list(resource, { status: 'all' });
    return { [definition.sheets[0]?.name ?? 'Data']: response.data };
  }

  private async importLibrary(resource: string, rows: Array<Record<string, unknown>>, actor: string, resolutions: DuplicateResolution[] = []): Promise<TransferImportResult> {
    const current = (await this.libraryService.list(resource, { status: 'all' })).data;
    const references = await this.references(resource);
    const resolutionMap = new Map(resolutions.map((resolution) => [resolution.rowIndex, resolution.action]));
    const result: TransferImportResult = { created: 0, errors: [], processed: rows.length, skipped: 0, updated: 0 };
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const payload = this.prepareLibraryPayload(resource, row, references);
      const identity = this.libraryIdentity(resource, { ...row, ...payload, id: '' });
      const match = current.find((record) => this.libraryIdentity(resource, record) === identity);
      if (match) {
        const resolution = resolutionMap.get(i) ?? 'overwrite';
        if (resolution === 'overwrite') {
          await this.repo.saveToHistoric(resource, match.id, 'overwrite', match as Record<string, unknown>, actor);
          await this.libraryService.update(resource, match.id, payload, actor);
          result.updated += 1;
        } else {
          const newPayload = this.generateNewCodePayload(resource, payload);
          const created = await this.libraryService.create(resource, newPayload, actor);
          current.push({ ...row, ...newPayload, id: created.id });
          result.created += 1;
        }
      } else {
        const created = await this.libraryService.create(resource, payload, actor);
        current.push({ ...row, ...payload, id: created.id });
        result.created += 1;
      }
    }
    return result;
  }

  private generateNewCodePayload(resource: string, payload: Record<string, unknown>): Record<string, unknown> {
    const suffix = `-copy-${Date.now().toString(36)}`;
    const newPayload = { ...payload };
    const codeField = this.codeFieldForResource(resource);
    if (codeField && newPayload[codeField]) {
      newPayload[codeField] = String(newPayload[codeField]) + suffix;
    }
    return newPayload;
  }

  private codeFieldForResource(resource: string): string | null {
    switch (resource) {
      case 'materials': return 'materialCode';
      case 'material-suppliers': return 'supplierCode';
      case 'machines': return 'machineCode';
      case 'molds': return 'moldCode';
      case 'benchmarks': return 'benchmarkCode';
      default: return null;
    }
  }

  private async references(resource: string): Promise<Record<string, LibraryRecord[]>> {
    const requested: string[] = [];
    if (resource === 'materials') requested.push('material-suppliers');
    if (resource === 'machine-parameters' || resource === 'machine-setup-profiles') requested.push('machines');
    if (resource === 'mold-zones') requested.push('molds');
    if (resource === 'scoring-rules') requested.push('benchmarks', 'metrics');
    if (resource === 'scoring-profiles') requested.push('metrics');
    const entries = await Promise.all(requested.map(async (key) => [key, (await this.libraryService.list(key, { status: 'all' })).data] as const));
    return Object.fromEntries(entries);
  }

  private prepareLibraryPayload(resource: string, row: Record<string, unknown>, refs: Record<string, LibraryRecord[]>): Record<string, unknown> {
    const payload = Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null && value !== ''));
    if (resource === 'materials' && row['materialSupplierCode']) {
      payload['materialSupplierId'] = this.referenceId(refs['material-suppliers'], 'supplierCode', row['materialSupplierCode']);
      delete payload['materialSupplierCode'];
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
      case 'machine-setup-profiles': return [row['profileCode'], row['parameterKey'] ?? '', row['positionLabel'] ?? ''].join('|');
      case 'molds': return String(row['moldCode']);
      case 'mold-zones': return [row['moldCode'] ?? row['moldId'], row['zoneNumber']].join('|');
      case 'benchmarks': return [row['benchmarkCode'], row['profileVersion']].join('|');
      case 'scoring-rules': return [`${row['benchmarkProfileId'] ?? `${row['benchmarkCode']}|${row['profileVersion']}`}`, row['metricId'] ?? row['metricKey']].join('|');
      case 'scoring-profiles': return [row['scoringProfileId'] ?? row['scoringCode'] ?? row['profileName'], row['metricKey']].join('|');
      case 'testing': return [row['productionRunCode'] ?? row['runCode'], row['ballTestType']].join('|');
      default: return '';
    }
  }

  private requireDefinition(resource: string) {
    const definition = getTransferDefinition(resource);
    if (!definition) throw new NotFoundError(`Data transfer resource ${resource}`);
    return definition;
  }
}
