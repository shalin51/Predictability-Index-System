import { getPool } from '../../infrastructure/database/pg-pool';

export class MaterialCatalogRepository {
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
        SELECT mpf.id, mpd.property_key AS "propertyKey", mpd.category, mpd.canonical_name AS "propertyName",
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
}
