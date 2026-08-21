import type { PoolClient } from 'pg';
import { getPool } from '../../../infrastructure/database/pg-pool';
import type { ReportListQuery, ReportRecord, ReportSnapshot } from '../report.types';

export class ReportRepository {
  async exportDataset(reportId: string): Promise<Record<string, ReportRecord[]>> {
    const context = await getPool().query<{ productionRunId: string; formulationId: string }>(
      `SELECT gr.production_run_id AS "productionRunId", pr.formulation_id AS "formulationId"
       FROM generated_reports gr
       JOIN production_runs pr ON pr.id = gr.production_run_id
       WHERE gr.id = $1`,
      [reportId]
    );
    const report = context.rows[0];
    if (!report) return {};

    const formulationId = report.formulationId;
    const componentSql = `
      SELECT fc.id, fc.formulation_id AS "formulationId", fc.material_id AS "materialId",
             fc.supplier_id AS "supplierId", fc.material_lot_id AS "materialLotId",
             fc.percent_composition::float AS percent, fc.basis, fc.sort_order AS "sortOrder"
      FROM formulation_components fc
      WHERE fc.formulation_id = $1
      ORDER BY fc.sort_order, fc.created_at`;
    const [formulations, components] = await Promise.all([
      getPool().query(`SELECT id, formulation_code AS "formulationCode", version_no AS "version", name, status::text AS status, target_benchmark_id AS "targetBenchmarkId", created_at AS "createdAt", updated_at AS "updatedAt" FROM formulations WHERE id = $1`, [formulationId]),
      getPool().query(componentSql, [formulationId]),
    ]);
    const materialIds = components.rows.map((row) => row.materialId).filter(Boolean);
    const supplierIds = components.rows.map((row) => row.supplierId).filter(Boolean);
    const lotIds = components.rows.map((row) => row.materialLotId).filter(Boolean);
    const [materials, suppliers, lots, supplierMaterials, properties] = await Promise.all([
      getPool().query(`SELECT id, material_code AS "materialCode", material_name AS "materialName", material_type AS "materialType", supplier_id AS "supplierId", product_grade AS "productGrade", chemistry, role_in_blend AS "roleInBlend", default_unit AS "defaultUnit", material_lot AS "defaultLot", source_file AS "sourceFile", source_revision_date AS "sourceRevisionDate", status::text AS status, notes FROM materials WHERE id = ANY($1::uuid[]) ORDER BY material_code`, [materialIds]),
      getPool().query(`SELECT id, supplier_code AS "supplierCode", supplier_name AS "supplierName", supplier_type AS "supplierType", contact_info AS "contactInfo", status::text AS status, notes FROM suppliers WHERE id = ANY($1::uuid[]) ORDER BY supplier_name`, [supplierIds]),
      getPool().query(`SELECT id, supplier_material_id AS "supplierMaterialId", lot_number AS "lotNumber", received_date AS "receivedDate", expiration_date AS "expirationDate", status::text AS status, notes FROM material_lots WHERE id = ANY($1::uuid[]) ORDER BY lot_number`, [lotIds]),
      getPool().query(`SELECT id, supplier_id AS "supplierId", material_id AS "materialId", supplier_material_code AS "supplierMaterialCode", status::text AS status FROM supplier_materials WHERE material_id = ANY($1::uuid[]) AND supplier_id = ANY($2::uuid[]) ORDER BY supplier_material_code`, [materialIds, supplierIds]),
      getPool().query(`SELECT mpf.id, mpf.material_id AS "materialId", mpf.property_definition_id AS "propertyDefinitionId", mpd.property_key AS "propertyKey", mpd.canonical_name AS "propertyName", mpd.category, mpf.value_numeric::float AS "valueNumeric", mpf.value_text AS "valueText", mpf.qualifier, mpf.unit, mpf.test_method AS "testMethod", mpf.test_condition AS "testCondition", mpf.temperature_c::float AS "temperatureC", mpf.load, mpf.duration, mpf.frequency, mpf.direction, mpf.specimen, mpf.process_type AS "processType", mpf.zone, mpf.source_file AS "sourceFile", mpf.source_page AS "sourcePage", mpf.source_revision_date AS "sourceRevisionDate", mpf.notes FROM material_property_facts mpf JOIN material_property_definitions mpd ON mpd.id = mpf.property_definition_id WHERE mpf.material_id = ANY($1::uuid[]) ORDER BY mpd.property_key, mpf.created_at`, [materialIds]),
    ]);
    const propertyDefinitionIds = properties.rows.map((row) => row.propertyDefinitionId).filter(Boolean);
    const definitions = await getPool().query(`SELECT id, property_key AS "propertyKey", canonical_name AS "propertyName", category, value_type AS "valueType", common_units AS "commonUnits", condition_dimensions AS "conditionDimensions", status::text AS status FROM material_property_definitions WHERE id = ANY($1::uuid[]) ORDER BY property_key`, [propertyDefinitionIds]);
    const runs = await getPool().query(`SELECT id, run_code AS "runCode", formulation_id AS "formulationId", status::text AS status, date_produced AS "dateProduced", machine_id AS "machineId", mold_id AS "moldId", created_at AS "createdAt" FROM production_runs WHERE id = $1`, [report.productionRunId]);

    return {
      Formulations: formulations.rows as ReportRecord[],
      Materials: materials.rows as ReportRecord[],
      Suppliers: suppliers.rows as ReportRecord[],
      'Property Definitions': definitions.rows as ReportRecord[],
      'Material Properties': properties.rows as ReportRecord[],
      'Supplier Materials': supplierMaterials.rows as ReportRecord[],
      'Material Lots': lots.rows as ReportRecord[],
      'Formulation Components': components.rows as ReportRecord[],
      'Production Runs': runs.rows as ReportRecord[],
    };
  }

  async list(query: ReportListQuery = {}): Promise<ReportRecord[]> {
    const params: unknown[] = [];
    const clauses: string[] = [];

    if (query.runId) {
      params.push(query.runId);
      clauses.push(`gr.production_run_id = $${params.length}`);
    }

    if (query.status && query.status !== 'all') {
      params.push(query.status);
      clauses.push(`gr.status = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      clauses.push(`(
        LOWER(gr.report_name) LIKE $${params.length}
        OR LOWER(pr.run_code) LIKE $${params.length}
        OR LOWER(f.formulation_code) LIKE $${params.length}
      )`);
    }

    const result = await getPool().query(
      `${this.listSql()}
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY gr.generated_at DESC`,
      params
    );
    return result.rows as ReportRecord[];
  }

  async findById(id: string): Promise<ReportRecord | null> {
    const result = await getPool().query(`${this.listSql()} WHERE gr.id = $1`, [id]);
    return (result.rows[0] as ReportRecord | undefined) ?? null;
  }

  async latestForRun(runId: string): Promise<ReportRecord | null> {
    const result = await getPool().query(
      `${this.listSql()} WHERE gr.production_run_id = $1 ORDER BY gr.generated_at DESC LIMIT 1`,
      [runId]
    );
    return (result.rows[0] as ReportRecord | undefined) ?? null;
  }

  async runContext(runId: string): Promise<ReportRecord | null> {
    const result = await getPool().query(
      `SELECT pr.id, pr.run_code AS "runCode", pr.status::text AS status,
              pr.date_produced AS "dateProduced",
              CONCAT(f.formulation_code, ' V', f.version_no) AS formulation,
              f.id AS "formulationId", f.formulation_code AS "formulationCode", f.version_no AS "formulationVersion",
              bp.benchmark_name AS "targetBenchmark",
              m.machine_code AS machine, mo.mold_code AS mold,
              pr.injection_pressure::float AS "injectionPressure", pr.injection_pressure_unit AS "injectionPressureUnit",
              pr.melt_temperature::float AS "meltTemperature", pr.melt_temperature_unit AS "meltTemperatureUnit",
              pr.cooling_time::float AS "coolingTime", pr.cooling_time_unit AS "coolingTimeUnit",
              pr.cycle_time::float AS "cycleTime", pr.cycle_time_unit AS "cycleTimeUnit",
              pr.cure_hours_before_test::float AS "cureHoursBeforeTest"
       FROM production_runs pr
       JOIN formulations f ON f.id = pr.formulation_id
       LEFT JOIN benchmark_profiles bp ON bp.id = f.target_benchmark_id
       JOIN machines m ON m.id = pr.machine_id
       JOIN molds mo ON mo.id = pr.mold_id
       WHERE pr.id = $1`,
      [runId]
    );
    return (result.rows[0] as ReportRecord | undefined) ?? null;
  }

  async scoreReports(runId: string): Promise<ReportRecord[]> {
    const result = await getPool().query(
      `SELECT sr.id, sr.production_run_id AS "productionRunId",
              bp.benchmark_code AS "benchmarkCode", bp.benchmark_name AS "benchmarkName",
              av.algorithm_code AS "algorithmCode", av.version AS "algorithmVersion",
              sr.overall_similarity_score::float AS "overallSimilarityScore",
              sr.predictability_index::float AS "predictabilityIndex",
              sr.production_readiness_score::float AS "productionReadinessScore",
              sr.required_metric_completion_score::float AS "requiredMetricCompletionScore",
              sr.traffic_light::text AS "trafficLight",
              sr.key_risks AS "keyRisks", sr.recommendations,
              sr.is_best_match AS "isBestMatch", sr.generated_at AS "generatedAt"
       FROM score_reports sr
       JOIN benchmark_profiles bp ON bp.id = sr.benchmark_profile_id
       JOIN algorithm_versions av ON av.id = sr.algorithm_version_id
       WHERE sr.production_run_id = $1
       ORDER BY sr.is_best_match DESC, sr.predictability_index DESC`,
      [runId]
    );

    const reports = result.rows as ReportRecord[];
    for (const report of reports) {
      report['metrics'] = await this.scoreReportMetrics(String(report.id));
    }
    return reports;
  }

  async runSummaries(runId: string): Promise<ReportRecord[]> {
    const result = await getPool().query(
      `SELECT rms.id, md.display_name AS "metricName", md.metric_key AS "metricKey",
              md.category::text AS category,
              tcd.condition_name AS "conditionName",
              rms.n_samples AS "nSamples",
              rms.mean_value::float AS "meanValue",
              rms.std_dev::float AS "stdDev",
              rms.min_value::float AS "minValue",
              rms.max_value::float AS "maxValue",
              rms.unit,
              rms.source_table AS "sourceTable",
              rms.generated_at AS "generatedAt"
       FROM run_metric_summaries rms
       JOIN metric_definitions md ON md.id = rms.metric_id
       LEFT JOIN test_condition_definitions tcd ON tcd.id = rms.condition_id
       WHERE rms.production_run_id = $1
       ORDER BY md.category::text, md.sort_order, md.metric_key`,
      [runId]
    );
    return result.rows as ReportRecord[];
  }

  async formulationRecipe(formulationId: string): Promise<ReportRecord[]> {
    const result = await getPool().query(
      `SELECT m.material_code AS "materialCode",
              m.material_name AS material,
              s.supplier_name AS supplier,
              ml.lot_number AS lot,
              fc.percent_composition::float AS percent,
              fc.basis
       FROM formulation_components fc
       JOIN materials m ON m.id = fc.material_id
       JOIN suppliers s ON s.id = fc.supplier_id
       LEFT JOIN material_lots ml ON ml.id = fc.material_lot_id
       WHERE fc.formulation_id = $1
       ORDER BY fc.sort_order, fc.created_at`,
      [formulationId]
    );
    return result.rows as ReportRecord[];
  }

  async labResults(runId: string): Promise<ReportRecord[]> {
    const result = await getPool().query(
      `SELECT 'sample_result' AS "resultType", s.sample_code AS "sampleCode",
              md.display_name AS "metricName", md.category::text AS category,
              str.value_numeric::float AS value, str.unit,
              NULL::text AS "conditionName", str.tested_at AS "recordedAt"
       FROM sample_test_results str
       JOIN samples s ON s.id = str.sample_id
       JOIN metric_definitions md ON md.id = str.metric_id
       WHERE s.production_run_id = $1
       UNION ALL
       SELECT 'environmental_result' AS "resultType", s.sample_code AS "sampleCode",
              md.display_name AS "metricName", md.category::text AS category,
              etr.value_numeric::float AS value, etr.unit,
              tcd.condition_name AS "conditionName", etr.tested_at AS "recordedAt"
       FROM environmental_test_results etr
       JOIN samples s ON s.id = etr.sample_id
       JOIN metric_definitions md ON md.id = etr.metric_id
       LEFT JOIN test_condition_definitions tcd ON tcd.id = etr.test_condition_id
       WHERE s.production_run_id = $1
       ORDER BY "recordedAt" DESC NULLS LAST, "sampleCode", "metricName"`,
      [runId]
    );
    return result.rows as ReportRecord[];
  }

  async processSetup(runId: string): Promise<ReportRecord> {
    const [revision, values, notes, drying, material] = await Promise.all([
      getPool().query(`SELECT psr.revision_no AS "revisionNo", psr.approved_by_display AS "approvedBy", psr.approved_at AS "approvedAt", si.original_filename AS "sourceFilename", si.file_sha256 AS "sourceSha256" FROM production_runs pr LEFT JOIN process_setup_revisions psr ON psr.id = pr.process_setup_revision_id LEFT JOIN setup_sheet_imports si ON si.production_run_id = pr.id WHERE pr.id = $1`, [runId]),
      getPool().query(`SELECT d.section_key AS section, d.display_name AS "displayName", v.position_type AS "positionType", v.position_index AS "positionIndex", v.position_label AS "positionLabel", v.setpoint_numeric::float AS "setpointNumeric", v.setpoint_text AS "setpointText", v.setpoint_date AS "setpointDate", v.actual_numeric::float AS "actualNumeric", v.actual_text AS "actualText", v.actual_date AS "actualDate", v.unit, v.tolerance_min::float AS "toleranceMin", v.tolerance_max::float AS "toleranceMax", v.notes FROM production_run_process_values v JOIN process_parameter_definitions d ON d.id = v.parameter_definition_id WHERE v.production_run_id = $1 ORDER BY d.sort_order, v.position_index NULLS FIRST`, [runId]),
      getPool().query(`SELECT note_type AS "noteType", note_text AS "noteText" FROM production_run_notes WHERE production_run_id = $1 ORDER BY created_at`, [runId]),
      getPool().query(`SELECT dryer_code AS "dryerCode", setpoint_temperature::float AS "setpointTemperature", actual_temperature::float AS "actualTemperature", temperature_unit AS "temperatureUnit", started_at AS "startedAt", ended_at AS "endedAt", duration_hours::float AS "durationHours", approved_by_display AS "approvedBy" FROM material_drying_events WHERE production_run_id = $1 ORDER BY started_at`, [runId]),
      getPool().query(`SELECT mp.trade_name AS "tradeName", mp.manufacturer, mp.grade, mp.color_pigment AS "colorPigment", mp.melt_flow_index::float AS "meltFlowIndex", mp.specific_gravity::float AS "specificGravity", mp.shrink_rate::float AS "shrinkRate", mp.moisture_absorption_pct::float AS "moistureAbsorptionPct" FROM setup_sheet_imports si JOIN material_processing_profiles mp ON mp.id = si.material_processing_profile_id WHERE si.production_run_id = $1`, [runId]),
    ]);
    return { ...(revision.rows[0] ?? {}), values: values.rows, notes: notes.rows, dryingEvents: drying.rows, materialProfile: material.rows[0] ?? null };
  }

  async saveSnapshot(input: {
    generatedBy: string | null;
    primaryScoreReportId: string | null;
    productionRunId: string;
    reportName: string;
    snapshot: ReportSnapshot;
  }): Promise<ReportRecord> {
    const result = await getPool().query<{ id: string }>(
      `INSERT INTO generated_reports
        (production_run_id, primary_score_report_id, report_name, report_snapshot, generated_by, snapshot_schema_version)
       VALUES ($1, $2, $3, $4::jsonb, $5, 2)
       RETURNING id`,
      [
        input.productionRunId,
        input.primaryScoreReportId,
        input.reportName,
        JSON.stringify(input.snapshot),
        input.generatedBy,
      ]
    );
    return (await this.findById(result.rows[0]?.id ?? '')) as ReportRecord;
  }

  private async scoreReportMetrics(scoreReportId: string): Promise<ReportRecord[]> {
    const result = await getPool().query(
      `SELECT srm.id, md.display_name AS "metricName", md.metric_key AS "metricKey",
              md.category::text AS category,
              srm.run_mean_value::float AS "runMeanValue",
              srm.benchmark_target_mean::float AS "benchmarkTargetMean",
              srm.min_acceptable::float AS "minAcceptable",
              srm.max_acceptable::float AS "maxAcceptable",
              srm.weight::float AS weight,
              srm.metric_score::float AS "metricScore",
              srm.traffic_light::text AS "trafficLight",
              srm.risk_level AS "riskLevel",
              srm.risk_note AS "riskNote"
       FROM score_report_metrics srm
       JOIN metric_definitions md ON md.id = srm.metric_id
       WHERE srm.score_report_id = $1
       ORDER BY md.category::text, md.sort_order, md.metric_key`,
      [scoreReportId]
    );
    return result.rows as ReportRecord[];
  }

  private listSql(): string {
    return `SELECT gr.id, gr.production_run_id AS "productionRunId",
                   gr.primary_score_report_id AS "primaryScoreReportId",
                   gr.report_name AS "reportName",
                   gr.report_type AS "reportType",
                   gr.status,
                   gr.snapshot_schema_version AS "snapshotSchemaVersion",
                   gr.report_snapshot AS "reportSnapshot",
                   gr.generated_by AS "generatedBy",
                   gr.generated_at AS "generatedAt",
                   gr.updated_at AS "updatedAt",
                   pr.run_code AS "runCode",
                   CONCAT(f.formulation_code, ' V', f.version_no) AS formulation,
                   gr.report_snapshot #>> '{executiveSummary,bestMatch}' AS "bestMatch",
                   NULLIF(gr.report_snapshot #>> '{executiveSummary,predictabilityIndex}', '')::float AS "predictabilityIndex",
                   gr.report_snapshot #>> '{executiveSummary,trafficLight}' AS "trafficLight"
            FROM generated_reports gr
            JOIN production_runs pr ON pr.id = gr.production_run_id
            JOIN formulations f ON f.id = pr.formulation_id`;
  }

  async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
