import { getPool } from '../../infrastructure/database/pg-pool';

export class MaterialCatalogRepository {
  async exists(id: string): Promise<boolean> {
    const result = await getPool().query('SELECT 1 FROM materials WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async propertyOptions(): Promise<Record<string, unknown>[]> {
    const result = await getPool().query(
      `SELECT id, property_key AS "propertyKey", canonical_name AS "propertyName",
              category, common_units AS "commonUnits", value_type AS "valueType"
       FROM material_property_definitions
       WHERE status = 'active'
       ORDER BY category, canonical_name`
    );
    return result.rows as Record<string, unknown>[];
  }

  async propertyDefinitionKeyExists(propertyKey: string): Promise<boolean> {
    const result = await getPool().query('SELECT 1 FROM material_property_definitions WHERE property_key = $1', [propertyKey]);
    return (result.rowCount ?? 0) > 0;
  }

  async propertyDefinitionExists(id: string): Promise<boolean> {
    const result = await getPool().query(
      `SELECT 1 FROM material_property_definitions WHERE id = $1 AND status = 'active'`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async createPropertyDefinition(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await getPool().query(
      `INSERT INTO material_property_definitions
        (property_key, category, canonical_name, common_units, value_type, origin, implementation_notes, status)
       VALUES ($1, $2, $3, $4, $5, 'Manual entry', $6, 'active')
       RETURNING id, property_key AS "propertyKey", canonical_name AS "propertyName",
                 category, common_units AS "commonUnits", value_type AS "valueType"`,
      [input['propertyKey'], input['category'], input['propertyName'], input['commonUnits'], input['valueType'], input['implementationNotes']]
    );
    return result.rows[0] as Record<string, unknown>;
  }

  async detail(id: string): Promise<Record<string, unknown> | null> {
    const pool = getPool();
    const [material, properties] = await Promise.all([
      pool.query(`
        SELECT m.id, m.material_code AS "materialCode", m.material_name AS "materialName",
               m.product_grade AS "productGrade", m.material_lot AS "materialLot", m.chemistry,
               m.role_in_blend AS "roleInBlend", m.source_file AS "sourceFile",
               m.source_revision_date AS "sourceRevisionDate", m.notes, m.status::text AS status,
               s.supplier_code AS "materialSupplierId", s.supplier_name AS "supplierName"
        FROM materials m
        LEFT JOIN suppliers s ON s.id = m.supplier_id
        WHERE m.id = $1
      `, [id]),
      pool.query(`
        SELECT mpf.id, mpf.property_definition_id AS "propertyDefinitionId", mpd.property_key AS "propertyKey", mpd.category, mpd.canonical_name AS "propertyName",
               mpf.source_label AS "sourceLabel", mpf.value_numeric::float AS "valueNumeric", mpf.value_text AS "valueText",
               mpf.qualifier, mpf.unit, mpf.test_method AS "testMethod", mpf.test_condition AS "testCondition",
               mpf.temperature_c::float AS "temperatureC", mpf.load, mpf.duration, mpf.frequency, mpf.direction,
               mpf.specimen, mpf.process_type AS "processType", mpf.zone, mpf.source_page AS "sourcePage",
               COALESCE(mpf.source_file, msd.source_filename, m.source_file) AS "sourceFilename", mpf.notes
        FROM material_property_facts mpf
        JOIN materials m ON m.id = mpf.material_id
        JOIN material_property_definitions mpd ON mpd.id = mpf.property_definition_id
        LEFT JOIN material_source_documents msd ON msd.id = mpf.source_document_id
        WHERE mpf.material_id = $1
        ORDER BY mpd.category, mpd.canonical_name, mpf.test_condition NULLS FIRST
      `, [id]),
    ]);

    const row = material.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return { ...row, properties: properties.rows };
  }

  async property(materialId: string, propertyFactId: string): Promise<Record<string, unknown> | null> {
    const result = await getPool().query(`${this.propertySelect()} WHERE mpf.material_id = $1 AND mpf.id = $2`, [materialId, propertyFactId]);
    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  async createProperty(materialId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const definition = await getPool().query<{ canonical_name: string }>(
      `SELECT canonical_name FROM material_property_definitions WHERE id = $1 AND status = 'active'`,
      [input['propertyDefinitionId']]
    );
    const sourceLabel = definition.rows[0]?.canonical_name;
    if (!sourceLabel) throw new Error('Property definition not found');
    const inserted = await getPool().query<{ id: string }>(
      `INSERT INTO material_property_facts
        (material_id, property_definition_id, source_label, value_numeric, value_text, qualifier,
         unit, test_method, test_condition, notes, fact_hash, source_import_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL)
       RETURNING id`,
      [materialId, input['propertyDefinitionId'], sourceLabel, input['valueNumeric'], input['valueText'], input['qualifier'],
        input['unit'], input['testMethod'], input['testCondition'], input['notes'], input['factHash']]
    );
    return (await this.property(materialId, inserted.rows[0]?.id ?? '')) as Record<string, unknown>;
  }

  async updateProperty(materialId: string, propertyFactId: string, input: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    await getPool().query(
      `UPDATE material_property_facts
       SET value_numeric = $3, value_text = $4, qualifier = $5, unit = $6,
           test_method = $7, test_condition = $8, notes = $9, updated_at = now()
       WHERE material_id = $1 AND id = $2`,
      [materialId, propertyFactId, input['valueNumeric'], input['valueText'], input['qualifier'], input['unit'],
        input['testMethod'], input['testCondition'], input['notes']]
    );
    return this.property(materialId, propertyFactId);
  }

  private propertySelect(): string {
    return `SELECT mpf.id, mpf.property_definition_id AS "propertyDefinitionId",
                   mpd.property_key AS "propertyKey", mpd.category, mpd.canonical_name AS "propertyName",
                   mpf.source_label AS "sourceLabel", mpf.value_numeric::float AS "valueNumeric",
                   mpf.value_text AS "valueText", mpf.qualifier, mpf.unit,
                   mpf.test_method AS "testMethod", mpf.test_condition AS "testCondition", mpf.notes
            FROM material_property_facts mpf
            JOIN material_property_definitions mpd ON mpd.id = mpf.property_definition_id`;
  }
}
