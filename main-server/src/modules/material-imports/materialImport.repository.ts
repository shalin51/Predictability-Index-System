import { createHash } from 'crypto';
import type { PoolClient } from 'pg';
import { getPool } from '../../infrastructure/database/pg-pool';
import type {
  MaterialImportCommitInput,
  MaterialImportValidation,
  MaterialMatchPreview,
  ParsedMaterialRecord,
  ParsedMaterialWorkbook,
  ParsedPropertyFact,
} from './materialImport.types';

export interface MaterialImportRecord {
  id: string;
  status: string;
  originalFilename: string;
  fileSizeBytes: number;
  fileSha256: string;
  blobObjectKey: string;
  templateKey: string;
  templateVersion: string;
  parsedSnapshot: ParsedMaterialWorkbook;
  validationResults: MaterialImportValidation;
  commitSummary?: Record<string, number> | null;
  failureMessage?: string | null;
  committedAt?: string | null;
}

interface ExistingMaterial {
  id: string;
  materialCode?: string | null;
  materialName?: string | null;
  externalId?: string | null;
}

export class MaterialImportRepository {
  async findByHash(sha256: string): Promise<MaterialImportRecord | null> {
    const result = await getPool().query(this.select('WHERE file_sha256 = $1'), [sha256]);
    return (result.rows[0] as MaterialImportRecord | undefined) ?? null;
  }

  async findImport(id: string): Promise<MaterialImportRecord | null> {
    const result = await getPool().query(this.select('WHERE id = $1'), [id]);
    return (result.rows[0] as MaterialImportRecord | undefined) ?? null;
  }

  async createImport(input: {
    id: string;
    filename: string;
    size: number;
    sha256: string;
    blobObjectKey: string;
    snapshot: ParsedMaterialWorkbook;
    validation: MaterialImportValidation;
    actor: string;
  }): Promise<MaterialImportRecord> {
    const status = input.validation.errors.length > 0 ? 'validation_failed' : 'ready';
    await getPool().query(
      `INSERT INTO material_catalog_imports
        (id, status, original_filename, file_size_bytes, file_sha256, blob_object_key,
         template_key, template_version, parsed_snapshot, validation_results, imported_by_actor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11)`,
      [input.id, status, input.filename, input.size, input.sha256, input.blobObjectKey, input.snapshot.templateKey, input.snapshot.templateVersion, JSON.stringify(input.snapshot), JSON.stringify(input.validation), input.actor]
    );
    return (await this.findImport(input.id)) as MaterialImportRecord;
  }

  async previewMatches(snapshot: ParsedMaterialWorkbook): Promise<MaterialMatchPreview[]> {
    const existing = await this.existingMaterials();
    return snapshot.materials.map((material) => {
      const matched = this.matchMaterial(material, existing);
      return {
        externalId: material.externalId,
        productGrade: material.productGrade,
        manufacturer: material.manufacturer,
        matchedMaterialId: matched?.id ?? null,
        matchedMaterialCode: matched?.materialCode ?? null,
        action: matched ? 'match' : 'create',
      };
    });
  }

  async materialOptions(): Promise<Array<{ id: string; code: string | null; label: string | null }>> {
    const result = await getPool().query(`SELECT id, material_code AS code, material_name AS label FROM materials WHERE status = 'active' ORDER BY material_code`);
    return result.rows as Array<{ id: string; code: string | null; label: string | null }>;
  }

  async commitImport(id: string, input: MaterialImportCommitInput, actor: string): Promise<Record<string, number>> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query(this.select('WHERE id = $1 FOR UPDATE'), [id]);
      const record = locked.rows[0] as MaterialImportRecord | undefined;
      if (!record) throw new Error('IMPORT_NOT_FOUND');
      if (record.status === 'committed' && record.commitSummary) {
        await client.query('COMMIT');
        return record.commitSummary;
      }
      if (record.validationResults.errors.length > 0) throw new Error('VALIDATION_FAILED');

      const snapshot = record.parsedSnapshot;
      const definitions = new Map<string, string>();
      for (const definition of snapshot.propertyDefinitions) {
        const result = await client.query<{ id: string }>(
          `INSERT INTO material_property_definitions
            (property_key, category, canonical_name, source_labels_synonyms, condition_dimensions,
             common_units, value_type, origin, implementation_notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (property_key) DO UPDATE SET
             category = EXCLUDED.category,
             canonical_name = EXCLUDED.canonical_name,
             source_labels_synonyms = EXCLUDED.source_labels_synonyms,
             condition_dimensions = EXCLUDED.condition_dimensions,
             common_units = EXCLUDED.common_units,
             value_type = EXCLUDED.value_type,
             origin = EXCLUDED.origin,
             implementation_notes = EXCLUDED.implementation_notes,
             updated_at = now()
           RETURNING id`,
          [definition.propertyKey, definition.category, definition.canonicalName, definition.sourceLabelsSynonyms ?? null, definition.conditionDimensions ?? null, definition.commonUnits ?? null, definition.valueType, definition.origin ?? null, definition.implementationNotes ?? null]
        );
        definitions.set(definition.propertyKey.toLowerCase(), result.rows[0]?.id ?? '');
      }

      const existing = await this.existingMaterials(client);
      const materialIds = new Map<string, string>();
      const documentIds = new Map<string, string>();
      let createdMaterials = 0;
      let matchedMaterials = 0;
      let createdSuppliers = 0;
      let createdDocuments = 0;

      for (const material of snapshot.materials) {
        const supplier = await this.resolveSupplier(client, material);
        if (supplier.created) createdSuppliers += 1;
        const resolvedId = input.materialResolutions[material.externalId];
        let matched = resolvedId ? existing.find((item) => item.id === resolvedId) : this.matchMaterial(material, existing);
        if (resolvedId && !matched) throw new Error('INVALID_RESOLUTION');
        if (!matched) {
          matched = await this.createMaterial(client, material, supplier.id, existing);
          existing.push(matched);
          createdMaterials += 1;
        } else {
          matchedMaterials += 1;
          await client.query(
            `UPDATE materials SET supplier_id = COALESCE(supplier_id, $2), chemistry = COALESCE(NULLIF($3, ''), chemistry),
               role_in_blend = COALESCE(NULLIF($4, ''), role_in_blend), notes = COALESCE(notes, $5),
               product_grade = COALESCE(NULLIF($6, ''), product_grade),
               source_file = COALESCE(NULLIF($7, ''), source_file),
               source_revision_date = COALESCE($8::date, source_revision_date), updated_at = now()
             WHERE id = $1`,
            [
              matched.id,
              supplier.id,
              material.chemistry,
              material.roleInBlend ?? null,
              material.notes ?? null,
              material.productGrade,
              material.sourceFile,
              material.sourceRevisionDate ?? null,
            ]
          );
        }
        materialIds.set(material.externalId.toLowerCase(), matched.id);
        await client.query(
          `INSERT INTO material_external_identifiers (material_id, namespace, external_id)
           VALUES ($1, 'material-master-v1', $2)
           ON CONFLICT (namespace, external_id) DO UPDATE SET material_id = EXCLUDED.material_id`,
          [matched.id, material.externalId]
        );
        await client.query(
          `INSERT INTO supplier_materials (supplier_id, material_id, supplier_material_code, status)
           VALUES ($1,$2,$3,'active')
           ON CONFLICT (supplier_id, material_id, supplier_material_code) DO UPDATE SET status = 'active', updated_at = now()`,
          [supplier.id, matched.id, this.code(material.productGrade).slice(0, 100)]
        );
        const document = await this.resolveDocument(client, id, matched.id, material);
        documentIds.set(this.documentKey(material.externalId, material.sourceFile, material.sourceRevisionDate), document.id);
        if (document.created) createdDocuments += 1;
      }

      let createdFacts = 0;
      for (const fact of snapshot.propertyFacts) {
        const materialId = materialIds.get(fact.materialExternalId.toLowerCase());
        const definitionId = definitions.get(fact.propertyKey.toLowerCase());
        if (!materialId || !definitionId) throw new Error('INVALID_SNAPSHOT_REFERENCE');
        const documentId = documentIds.get(this.documentKey(fact.materialExternalId, fact.sourceFile, fact.sourceRevisionDate)) ?? null;
        const hash = this.factHash(fact);
        const inserted = await client.query(
          `INSERT INTO material_property_facts
            (material_id, property_definition_id, source_document_id, source_label, value_numeric, value_text,
             qualifier, unit, test_method, test_condition, temperature_c, load, duration, frequency,
             direction, specimen, process_type, zone, source_file, source_page, source_revision_date, notes, fact_hash, source_import_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::date,$22,$23,$24)
           ON CONFLICT (material_id, fact_hash) DO NOTHING`,
          [materialId, definitionId, documentId, fact.sourceLabel, fact.valueNumeric ?? null, fact.valueText ?? null, fact.qualifier ?? null, fact.unit ?? null, fact.testMethod, fact.testCondition ?? null, fact.temperatureC ?? null, fact.load ?? null, fact.duration ?? null, fact.frequency ?? null, fact.direction ?? null, fact.specimen ?? null, fact.processType ?? null, fact.zone ?? null, fact.sourceFile, fact.sourcePage ?? null, fact.sourceRevisionDate ?? null, fact.notes ?? null, hash, id]
        );
        createdFacts += inserted.rowCount ?? 0;
      }

      const summary = {
        materialsCreated: createdMaterials,
        materialsMatched: matchedMaterials,
        suppliersCreated: createdSuppliers,
        propertyDefinitions: definitions.size,
        propertyFactsCreated: createdFacts,
        sourceDocumentsCreated: createdDocuments,
      };
      await client.query(
        `UPDATE material_catalog_imports SET status = 'committed', commit_summary = $2::jsonb, failure_message = NULL, committed_at = now(), updated_at = now() WHERE id = $1`,
        [id, JSON.stringify(summary)]
      );
      await client.query(
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_values)
         VALUES ('material_catalog_imports', $1, 'COMMIT', $2, $3::jsonb)`,
        [id, actor, JSON.stringify(summary)]
      );
      await client.query('COMMIT');
      return summary;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markFailed(id: string, message: string): Promise<void> {
    await getPool().query(`UPDATE material_catalog_imports SET status = 'failed', failure_message = $2, updated_at = now() WHERE id = $1`, [id, message]);
  }

  private async existingMaterials(client?: PoolClient): Promise<ExistingMaterial[]> {
    const runner = client ?? getPool();
    const result = await runner.query(
      `SELECT m.id, m.material_code AS "materialCode", m.material_name AS "materialName", mei.external_id AS "externalId"
       FROM materials m
       LEFT JOIN material_external_identifiers mei ON mei.material_id = m.id AND mei.namespace = 'material-master-v1'`
    );
    return result.rows as ExistingMaterial[];
  }

  private matchMaterial(material: ParsedMaterialRecord, existing: ExistingMaterial[]): ExistingMaterial | undefined {
    const external = this.normalize(material.externalId);
    const grade = this.normalize(material.productGrade);
    return existing.find((item) => this.normalize(item.externalId) === external)
      ?? existing.find((item) => [item.materialCode, item.materialName].some((value) => this.normalize(value) === grade || this.normalize(value) === external))
      ?? existing.find((item) => {
        const code = this.normalize(item.materialCode);
        return code.length >= 6 && grade.endsWith(code);
      });
  }

  private async resolveSupplier(client: PoolClient, material: ParsedMaterialRecord): Promise<{ id: string; created: boolean }> {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM suppliers WHERE lower(COALESCE(supplier_name, name)) = lower($1) LIMIT 1`,
      [material.manufacturer]
    );
    if (existing.rows[0]) return { id: existing.rows[0].id, created: false };
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO suppliers (name, supplier_name, supplier_type, status)
       VALUES ($1::text,$1::varchar,$2,'active') RETURNING id`,
      [material.manufacturer, /lab trial/i.test(material.manufacturer) ? 'laboratory' : 'manufacturer']
    );
    return { id: inserted.rows[0]?.id ?? '', created: true };
  }

  private async createMaterial(client: PoolClient, material: ParsedMaterialRecord, supplierId: string, existing: ExistingMaterial[]): Promise<ExistingMaterial> {
    const base = this.code(material.productGrade).slice(0, 100);
    const occupied = new Set(existing.map((item) => item.materialCode?.toLowerCase()).filter(Boolean));
    const suffix = `_${this.code(material.externalId)}`;
    const code = occupied.has(base.toLowerCase()) ? `${base.slice(0, 100 - suffix.length)}${suffix}` : base;
    const type = /lab trial/i.test(material.manufacturer) || /blend trial/i.test(material.roleInBlend ?? '') ? 'lab_trial_compound' : 'polymer';
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO materials
       (name, material_type, supplier_id, unit, description, is_active, material_code, material_name,
         default_unit, status, notes, chemistry, role_in_blend, product_grade, source_file, source_revision_date)
       VALUES ($1::text,$2,$3,'wt%',$4,true,$5,$1::varchar,'wt%','active',$6,$4,$7,$1::varchar,$8,$9::date) RETURNING id`,
      [
        material.productGrade,
        type,
        supplierId,
        material.chemistry,
        code,
        material.notes ?? null,
        material.roleInBlend ?? null,
        material.sourceFile,
        material.sourceRevisionDate ?? null,
      ]
    );
    return { id: inserted.rows[0]?.id ?? '', materialCode: code, materialName: material.productGrade, externalId: material.externalId };
  }

  private async resolveDocument(client: PoolClient, importId: string, materialId: string, material: ParsedMaterialRecord): Promise<{ id: string; created: boolean }> {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM material_source_documents
       WHERE material_id = $1 AND source_filename = $2 AND source_revision_date IS NOT DISTINCT FROM $3::date LIMIT 1`,
      [materialId, material.sourceFile, material.sourceRevisionDate ?? null]
    );
    if (existing.rows[0]) return { id: existing.rows[0].id, created: false };
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO material_source_documents
        (material_id, source_filename, source_revision_date, manufacturer, notes, source_import_id)
       VALUES ($1,$2,$3::date,$4,$5,$6) RETURNING id`,
      [materialId, material.sourceFile, material.sourceRevisionDate ?? null, material.manufacturer, material.notes ?? null, importId]
    );
    return { id: inserted.rows[0]?.id ?? '', created: true };
  }

  private factHash(fact: ParsedPropertyFact): string {
    return createHash('sha256').update(JSON.stringify(fact)).digest('hex');
  }

  private documentKey(externalId: string, filename: string, revision?: string | null): string {
    return `${externalId.toLowerCase()}|${filename.toLowerCase()}|${revision ?? ''}`;
  }

  private normalize(value?: string | null): string {
    return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
  }

  private code(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'MATERIAL';
  }

  private select(suffix: string): string {
    return `SELECT id, status::text AS status, original_filename AS "originalFilename", file_size_bytes::int AS "fileSizeBytes",
      file_sha256 AS "fileSha256", blob_object_key AS "blobObjectKey", template_key AS "templateKey",
      template_version AS "templateVersion", parsed_snapshot AS "parsedSnapshot", validation_results AS "validationResults",
      commit_summary AS "commitSummary", failure_message AS "failureMessage", committed_at AS "committedAt"
      FROM material_catalog_imports ${suffix}`;
  }
}
