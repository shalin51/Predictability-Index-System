import { createHash, randomUUID } from 'crypto';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import type { AuditService } from '../audit/audit.service';
import { ProcessSetupRepository } from './processSetup.repository';
import type { SetupImportStorage } from './setupImport.storage';
import { SetupWorkbookParser } from './setupWorkbook.parser';
import type { SetupImportCommitInput } from './processSetup.types';

const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;

export class ProcessSetupService {
  constructor(
    private readonly repo: ProcessSetupRepository,
    private readonly parser: SetupWorkbookParser,
    private readonly storage: SetupImportStorage,
    private readonly audit: AuditService
  ) {}

  async preview(bytes: Buffer, filename: string, actor: string) {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new ValidationError('XLSX request body is required');
    if (bytes.length > MAX_WORKBOOK_BYTES) throw new ValidationError('Workbook exceeds the 10 MB limit');
    if (!filename.toLowerCase().endsWith('.xlsx')) throw new ValidationError('Only .xlsx workbooks are supported');
    if (bytes.subarray(0, 2).toString('hex') !== '504b') throw new ValidationError('Uploaded content is not an XLSX package');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const existing = await this.repo.findImportByHash(sha256);
    if (existing) return this.withMatches(existing);
    const { snapshot, validation } = this.parser.parse(bytes);
    const id = randomUUID();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `uncommitted/${new Date().toISOString().slice(0, 7)}/${id}/${safeName}`;
    await this.storage.save(objectKey, bytes, { sha256, importid: id, template: `${snapshot.templateKey}-${snapshot.templateVersion}` });
    let created;
    try {
      created = await this.repo.createImport({ id, filename: safeName, size: bytes.length, sha256, blobObjectKey: objectKey, snapshot, validation, actor });
    } catch (error) {
      await this.storage.remove(objectKey).catch(() => undefined);
      throw error;
    }
    return this.withMatches(created);
  }

  async getImport(id: string) {
    const record = await this.repo.findImport(id);
    if (!record) throw new NotFoundError(`Setup import ${id}`);
    return this.withMatches(record);
  }

  async commit(id: string, raw: Record<string, unknown>, actor: string) {
    const record = await this.repo.findImport(id);
    if (!record) throw new NotFoundError(`Setup import ${id}`);
    if (record.productionRunId) {
      const storageWarning = await this.markCommitted(record.blobObjectKey as string);
      return { importId: id, productionRunId: record.productionRunId, idempotent: true, storageWarning };
    }
    const errors = record.validationResults?.errors ?? [];
    if (errors.length > 0) throw new ValidationError(`Workbook has blocking errors: ${errors.join('; ')}`);
    const currentValidation = this.parser.validateSnapshot(record.parsedSnapshot);
    if (currentValidation.errors.length > 0) throw new ValidationError(`Stored workbook snapshot is no longer valid: ${currentValidation.errors.join('; ')}`);
    const input = this.commitInput(raw);
    try {
      const runId = await this.repo.commitImport(id, input, actor);
      const storageWarning = await this.markCommitted(record.blobObjectKey as string);
      return { importId: id, productionRunId: runId, idempotent: false, storageWarning };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const conflicts: Record<string, string> = {
        REVISION_CONTENT_CONFLICT: 'This revision number already exists with different setpoints; increment the workbook revision',
      };
      if (conflicts[message]) throw new ConflictError(conflicts[message]);
      if (message === 'IMPORT_NOT_FOUND') throw new NotFoundError(`Setup import ${id}`);
      if (['INVALID_RESOLUTION', 'INVALID_COMPONENT', 'MATERIAL_COMPONENT_MISMATCH'].includes(message)) throw new ValidationError('Selected library resolution is invalid or inconsistent with the formulation');
      if (message === 'VALIDATION_FAILED') throw new ValidationError('Workbook has blocking validation errors');
      await this.repo.markImportFailed(id, message || 'Database commit failed').catch(() => undefined);
      throw error;
    }
  }

  listSetups() { return this.repo.listSetups(); }

  async setupDetail(id: string) {
    const record = await this.repo.setupDetail(id);
    if (!record) throw new NotFoundError(`Process setup ${id}`);
    return record;
  }

  async runProcessSetup(runId: string) {
    const record = await this.repo.runProcessSetup(runId);
    if (!record) throw new NotFoundError(`Production run ${runId}`);
    return record;
  }

  async updateRunValues(runId: string, raw: Record<string, unknown>, actor: string) {
    const state = await this.repo.runState(runId);
    if (!state) throw new NotFoundError(`Production run ${runId}`);
    if (['completed', 'scored', 'archived'].includes(state.status)) throw new ConflictError('Completed or archived production runs are locked');
    const auditReason = String(raw['auditReason'] ?? '').trim();
    if (state.status === 'testing' && !auditReason) throw new ValidationError('Audit reason is required after testing starts');
    const values = Array.isArray(raw['values']) ? raw['values'].filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object') : [];
    if (values.length === 0) throw new ValidationError('At least one process value is required');
    for (const value of values) {
      if (!String(value['id'] ?? '')) throw new ValidationError('Each process value requires an id');
      const typedCount = [value['actualNumeric'], value['actualText'], value['actualDate']].filter((item) => item !== null && item !== undefined && item !== '').length;
      if (typedCount > 1) throw new ValidationError('A process value may contain only one actual value type');
    }
    try {
      await this.repo.updateRunValues(runId, values);
    } catch (error) {
      if (error instanceof Error && error.message === 'PROCESS_VALUE_NOT_FOUND') throw new NotFoundError('One or more process values');
      throw error;
    }
    await this.audit.log({ tableName: 'production_runs', recordId: runId, action: 'UPDATE', changedBy: actor, newValues: { processValueIds: values.map((value) => value['id']), auditReason: auditReason || undefined } });
    return this.runProcessSetup(runId);
  }

  private async withMatches(record: Awaited<ReturnType<ProcessSetupRepository['findImport']>>) {
    if (!record) return null;
    const matches = await this.repo.matchLibrary(record.parsedSnapshot);
    const requiredResolutions = ['formulations', 'machines', 'molds']
      .filter((key) => !(matches[key] ?? []).some((candidate) => candidate['matched'] === true));
    if (record.parsedSnapshot.header.materialName && !(matches['materials'] ?? []).some((candidate) => candidate['matched'] === true)) requiredResolutions.push('materials');
    if (record.parsedSnapshot.header.materialLotNumber && !(matches['lots'] ?? []).some((candidate) => candidate['matched'] === true)) requiredResolutions.push('lots', 'formulationComponents');
    const sectionSummaries = Object.values(record.parsedSnapshot.parameters.reduce<Record<string, { section: string; parameterCount: number; setpointCount: number; actualCount: number }>>((summary, parameter) => {
      const section = summary[parameter.section] ?? { section: parameter.section, parameterCount: 0, setpointCount: 0, actualCount: 0 };
      section.parameterCount += 1;
      if (parameter.setpoint != null) section.setpointCount += 1;
      if (parameter.actual != null) section.actualCount += 1;
      summary[parameter.section] = section;
      return summary;
    }, {}));
    return { ...record, matches, requiredResolutions, sectionSummaries, defaultInitialStatus: record.parsedSnapshot.hasActualReadings ? 'molded' : 'planned' };
  }

  private commitInput(raw: Record<string, unknown>): SetupImportCommitInput {
    const formulationId = String(raw['formulationId'] ?? '').trim();
    const machineId = String(raw['machineId'] ?? '').trim();
    const moldId = String(raw['moldId'] ?? '').trim();
    if (!formulationId || !machineId || !moldId) throw new ValidationError('Formulation, machine, and mold resolutions are required');
    const initialStatus = String(raw['initialStatus'] ?? '') as SetupImportCommitInput['initialStatus'];
    if (initialStatus && !['planned', 'molded'].includes(initialStatus)) throw new ValidationError('Initial status must be planned or molded');
    const cureHours = raw['cureHoursBeforeTest'] === undefined ? 72 : Number(raw['cureHoursBeforeTest']);
    if (!Number.isFinite(cureHours) || cureHours < 0) throw new ValidationError('Cure hours must be non-negative');
    const sampleRaw = raw['sampleGeneration'];
    let sampleGeneration: SetupImportCommitInput['sampleGeneration'];
    if (sampleRaw && typeof sampleRaw === 'object') {
      const candidate = sampleRaw as Record<string, unknown>;
      const count = Number(candidate['count']);
      const startingSampleCode = String(candidate['startingSampleCode'] ?? '').trim();
      if (!Number.isInteger(count) || count < 1 || count > 500 || !startingSampleCode) throw new ValidationError('Sample generation requires a count from 1 to 500 and a starting sample code');
      sampleGeneration = { count, startingSampleCode, cavityAssignments: Array.isArray(candidate['cavityAssignments']) ? candidate['cavityAssignments'].map((item) => item == null ? null : Number(item)) : undefined };
    }
    return { formulationId, machineId, moldId, primaryFormulationComponentId: this.optionalString(raw['primaryFormulationComponentId']), materialLotId: this.optionalString(raw['materialLotId']), materialId: this.optionalString(raw['materialId']), runCode: this.optionalString(raw['runCode']), cureHoursBeforeTest: cureHours, initialStatus: initialStatus || undefined, sampleGeneration };
  }
  private optionalString(value: unknown): string | null { return String(value ?? '').trim() || null; }
  private async markCommitted(objectKey: string): Promise<string | undefined> {
    try {
      await this.storage.markCommitted(objectKey);
      return undefined;
    } catch {
      return 'The run was committed, but Blob retention tagging must be retried';
    }
  }
}
