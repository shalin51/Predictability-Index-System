import { getPool } from '../../infrastructure/database/pg-pool';

export class MaterialCatalogRepository {
  async detail(id: string): Promise<Record<string, unknown> | null> {
    const pool = getPool();
    const [material, identifiers, sources, properties, processingReference] = await Promise.all([
      pool.query(`
        SELECT id, material_code AS "materialCode", material_name AS "materialName", material_type AS "materialType",
               chemistry, role_in_blend AS "roleInBlend", default_unit AS "defaultUnit", description, notes, status::text AS status
        FROM materials WHERE id = $1
      `, [id]),
      pool.query(`SELECT namespace, external_id AS "externalId" FROM material_external_identifiers WHERE material_id = $1 ORDER BY namespace`, [id]),
      pool.query(`
        SELECT id, source_filename AS "sourceFilename", source_revision_date AS "sourceRevisionDate", manufacturer, notes
        FROM material_source_documents WHERE material_id = $1 ORDER BY source_filename, source_revision_date DESC NULLS LAST
      `, [id]),
      pool.query(`
        SELECT mpf.id, mpd.property_key AS "propertyKey", mpd.category, mpd.canonical_name AS "propertyName",
               mpf.source_label AS "sourceLabel", mpf.value_numeric::float AS "valueNumeric", mpf.value_text AS "valueText",
               mpf.qualifier, mpf.unit, mpf.test_method AS "testMethod", mpf.test_condition AS "testCondition",
               mpf.temperature_c::float AS "temperatureC", mpf.load, mpf.duration, mpf.frequency, mpf.direction,
               mpf.specimen, mpf.process_type AS "processType", mpf.zone, mpf.source_page AS "sourcePage",
               msd.source_filename AS "sourceFilename", mpf.notes
        FROM material_property_facts mpf
        JOIN material_property_definitions mpd ON mpd.id = mpf.property_definition_id
        LEFT JOIN material_source_documents msd ON msd.id = mpf.source_document_id
        WHERE mpf.material_id = $1
        ORDER BY mpd.category, mpd.canonical_name, mpf.test_condition NULLS FIRST
      `, [id]),
      pool.query(`
        SELECT mpp.id AS "profileId", mpp.profile_version AS "profileVersion", mpp.trade_name AS "tradeName",
               mpp.manufacturer, mpp.grade, mpr.parameter_key AS "parameterKey", mpr.display_name AS "displayName",
               mpr.min_value::float AS "minimumValue", mpr.recommended_value::float AS "recommendedValue",
               mpr.max_value::float AS "maximumValue", mpr.unit, mpr.notes
        FROM material_processing_profiles mpp
        LEFT JOIN material_processing_ranges mpr ON mpr.material_processing_profile_id = mpp.id
        WHERE mpp.material_id = $1 AND mpp.status = 'approved'
        ORDER BY mpr.sort_order, mpr.display_name
      `, [id]),
    ]);

    const row = material.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return { ...row, externalIdentifiers: identifiers.rows, sourceDocuments: sources.rows, properties: properties.rows, processingReference: processingReference.rows };
  }
}
