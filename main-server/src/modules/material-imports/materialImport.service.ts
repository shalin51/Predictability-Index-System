import { createHash, randomUUID } from 'crypto';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import type { SetupImportStorage } from '../process-setups/setupImport.storage';
import type { MaterialImportCommitInput } from './materialImport.types';
import { MaterialImportRepository } from './materialImport.repository';
import { MaterialWorkbookParser } from './materialWorkbook.parser';

const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;

export class MaterialImportService {
  constructor(
    private readonly repo: MaterialImportRepository,
    private readonly parser: MaterialWorkbookParser,
    private readonly storage: SetupImportStorage,
  ) {}

  async preview(bytes: Buffer, filename: string, actor: string) {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new ValidationError('XLSX request body is required');
    if (bytes.length > MAX_WORKBOOK_BYTES) throw new ValidationError('Workbook exceeds the 10 MB limit');
    if (!filename.toLowerCase().endsWith('.xlsx')) throw new ValidationError('Only .xlsx workbooks are supported');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const existing = await this.repo.findByHash(sha256);
    if (existing) return this.withMatches(existing);

    const { snapshot, validation } = this.parser.parse(bytes);
    const id = randomUUID();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `material-imports/uncommitted/${new Date().toISOString().slice(0, 7)}/${id}/${safeName}`;
    await this.storage.save(objectKey, bytes, { sha256, importid: id, template: `${snapshot.templateKey}-${snapshot.templateVersion}` });
    try {
      const created = await this.repo.createImport({ id, filename: safeName, size: bytes.length, sha256, blobObjectKey: objectKey, snapshot, validation, actor });
      return this.withMatches(created);
    } catch (error) {
      await this.storage.remove(objectKey).catch(() => undefined);
      throw error;
    }
  }

  async getImport(id: string) {
    const record = await this.repo.findImport(id);
    if (!record) throw new NotFoundError(`Material import ${id}`);
    return this.withMatches(record);
  }

  async commit(id: string, raw: Record<string, unknown>, actor: string) {
    const record = await this.repo.findImport(id);
    if (!record) throw new NotFoundError(`Material import ${id}`);
    if (record.validationResults.errors.length > 0) throw new ValidationError(`Workbook has blocking errors: ${record.validationResults.errors.join('; ')}`);
    const current = this.parser.validateSnapshot(record.parsedSnapshot);
    if (current.errors.length > 0) throw new ValidationError(`Stored workbook snapshot is no longer valid: ${current.errors.join('; ')}`);
    const input: MaterialImportCommitInput = { materialResolutions: this.resolutions(raw['materialResolutions']) };
    try {
      const summary = await this.repo.commitImport(id, input, actor);
      await this.storage.markCommitted(record.blobObjectKey).catch(() => undefined);
      return { importId: id, summary, idempotent: record.status === 'committed' };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'IMPORT_NOT_FOUND') throw new NotFoundError(`Material import ${id}`);
      if (message === 'VALIDATION_FAILED') throw new ValidationError('Workbook has blocking validation errors');
      if (message === 'INVALID_RESOLUTION') throw new ValidationError('One or more material resolutions are invalid');
      if (message.includes('duplicate key')) throw new ConflictError('The material import conflicts with an existing record');
      await this.repo.markFailed(id, message || 'Database commit failed').catch(() => undefined);
      throw error;
    }
  }

  private async withMatches(record: NonNullable<Awaited<ReturnType<MaterialImportRepository['findImport']>>>) {
    const [matches, materialOptions] = await Promise.all([
      this.repo.previewMatches(record.parsedSnapshot),
      this.repo.materialOptions(),
    ]);
    return {
      ...record,
      matches,
      materialOptions,
      summary: {
        materials: record.parsedSnapshot.materials.length,
        propertyDefinitions: record.parsedSnapshot.propertyDefinitions.length,
        propertyFacts: record.parsedSnapshot.propertyFacts.length,
        createMaterials: matches.filter((item) => item.action === 'create').length,
        matchedMaterials: matches.filter((item) => item.action === 'match').length,
      },
    };
  }

  private resolutions(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .map(([key, candidate]) => [key, String(candidate ?? '').trim()])
      .filter((entry) => Boolean(entry[1])));
  }
}
