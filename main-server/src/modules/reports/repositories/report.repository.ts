import type { PoolClient } from 'pg';
import { getPool } from '../../../infrastructure/database/pg-pool';
import type { ReportListQuery, ReportRecord, ReportSnapshot } from '../report.types';

export class ReportRepository {
  async exportAllDataset(): Promise<Record<string, ReportRecord[]>> {
    const [formulations, materials, suppliers, definitions, properties, supplierMaterials, lots, components, runs, machines, machineCapabilities, molds, moldZones, parameterDefinitions, setupRevisions, setupParameters, runValues, runLots, runNotes, samples, testMethods, testConditions, sampleResults, environmentalResults, observations, ratings, benchmarks, benchmarkTargets] = await Promise.all([
      getPool().query(`SELECT id, formulation_code AS "formulationCode", version_no AS "version", status::text AS status, target_benchmark_id AS "targetBenchmarkId", notes, created_at AS "createdAt", updated_at AS "updatedAt" FROM formulations ORDER BY formulation_code, version_no`),
      getPool().query(`SELECT id, material_code AS "materialCode", material_name AS "materialName", material_type AS "materialType", supplier_id AS "supplierId", product_grade AS "productGrade", chemistry, role_in_blend AS "roleInBlend", default_unit AS "defaultUnit", material_lot AS "defaultLot", source_file AS "sourceFile", source_revision_date AS "sourceRevisionDate", status::text AS status, notes FROM materials ORDER BY material_code`),
      getPool().query(`SELECT id, supplier_code AS "supplierCode", supplier_name AS "supplierName", supplier_type AS "supplierType", contact_info AS "contactInfo", status::text AS status, notes FROM suppliers ORDER BY supplier_name`),
      getPool().query(`SELECT id, property_key AS "propertyKey", canonical_name AS "propertyName", category, value_type AS "valueType", common_units AS "commonUnits", condition_dimensions AS "conditionDimensions", status::text AS status FROM material_property_definitions ORDER BY property_key`),
      getPool().query(`SELECT mpf.id, mpf.material_id AS "materialId", mpf.property_definition_id AS "propertyDefinitionId", mpd.property_key AS "propertyKey", mpd.canonical_name AS "propertyName", mpd.category, mpf.value_numeric::float AS "valueNumeric", mpf.value_text AS "valueText", mpf.qualifier, mpf.unit, mpf.test_method AS "testMethod", mpf.test_condition AS "testCondition", mpf.temperature_c::float AS "temperatureC", mpf.load, mpf.duration, mpf.frequency, mpf.direction, mpf.specimen, mpf.process_type AS "processType", mpf.zone, mpf.source_file AS "sourceFile", mpf.source_page AS "sourcePage", mpf.source_revision_date AS "sourceRevisionDate", mpf.notes FROM material_property_facts mpf JOIN material_property_definitions mpd ON mpd.id = mpf.property_definition_id ORDER BY mpd.property_key, mpf.created_at`),
      getPool().query(`SELECT id, supplier_id AS "supplierId", material_id AS "materialId", supplier_material_code AS "supplierMaterialCode", status::text AS status FROM supplier_materials ORDER BY supplier_material_code`),
      getPool().query(`SELECT id, supplier_material_id AS "supplierMaterialId", lot_number AS "lotNumber", received_date AS "receivedDate", expiration_date AS "expirationDate", status::text AS status, notes FROM material_lots ORDER BY lot_number`),
      getPool().query(`SELECT id, formulation_id AS "formulationId", material_id AS "materialId", supplier_id AS "supplierId", material_lot_id AS "materialLotId", percent_composition::float AS percent, basis, sort_order AS "sortOrder" FROM formulation_components ORDER BY formulation_id, sort_order, created_at`),
      getPool().query(`SELECT id, run_code AS "runCode", formulation_id AS "formulationId", status::text AS status, date_produced AS "dateProduced", machine_id AS "machineId", mold_id AS "moldId", created_at AS "createdAt" FROM production_runs ORDER BY date_produced DESC, run_code`),
      getPool().query(`SELECT id, machine_code AS "machineCode", machine_name AS "machineName", location, status::text AS status, created_at AS "createdAt", updated_at AS "updatedAt" FROM machines ORDER BY machine_code`),
      getPool().query(`SELECT id, machine_id AS "machineId", parameter_key AS "parameterKey", display_name AS "displayName", section_key AS "sectionKey", position_type AS "positionType", position_index AS "positionIndex", position_label AS "positionLabel", minimum_value::float AS "minimumValue", maximum_value::float AS "maximumValue", unit, notes, sort_order AS "sortOrder", status::text AS status FROM machine_parameter_capabilities ORDER BY machine_id, sort_order`),
      getPool().query(`SELECT id, mold_code AS "moldCode", mold_name AS "moldName", mold_type AS "moldType", cavity_count AS "cavityCount", description, manufacturer, hot_runner_controller AS "hotRunnerController", zone_count AS "zoneCount", status::text AS status FROM molds ORDER BY mold_code`),
      getPool().query(`SELECT id, mold_id AS "moldId", zone_number AS "zoneNumber", zone_name AS "zoneName", zone_type AS "zoneType", minimum_temperature::float AS "minimumTemperature", maximum_temperature::float AS "maximumTemperature", temperature_unit AS "temperatureUnit", notes, status::text AS status FROM mold_zones ORDER BY mold_id, zone_number`),
      getPool().query(`SELECT id, parameter_key AS "parameterKey", section_key AS "sectionKey", display_name AS "displayName", data_type AS "dataType", default_unit AS "defaultUnit", sort_order AS "sortOrder", status::text AS status FROM process_parameter_definitions ORDER BY sort_order, parameter_key`),
      getPool().query(`SELECT id, machine_id AS "machineId", mold_id AS "moldId", formulation_id AS "formulationId", revision_no AS "revisionNo", status::text AS status, setup_hash AS "setupHash", hot_runner_manufacturer AS "hotRunnerManufacturer", hot_runner_controller_model AS "hotRunnerControllerModel", hot_runner_zone_count AS "hotRunnerZoneCount", approved_by_display AS "approvedBy", document_approval_date AS "documentApprovalDate" FROM process_setup_revisions ORDER BY created_at DESC`),
      getPool().query(`SELECT id, process_setup_revision_id AS "processSetupRevisionId", parameter_definition_id AS "parameterDefinitionId", position_type AS "positionType", position_index AS "positionIndex", position_label AS "positionLabel", value_numeric::float AS "valueNumeric", value_text AS "valueText", value_date AS "valueDate", unit, tolerance_min::float AS "toleranceMin", tolerance_max::float AS "toleranceMax", notes, sort_order AS "sortOrder" FROM process_setup_revision_parameters ORDER BY process_setup_revision_id, sort_order`),
      getPool().query(`SELECT id, production_run_id AS "productionRunId", parameter_definition_id AS "parameterDefinitionId", position_type AS "positionType", position_index AS "positionIndex", position_label AS "positionLabel", setpoint_numeric::float AS "setpointNumeric", setpoint_text AS "setpointText", setpoint_date AS "setpointDate", actual_numeric::float AS "actualNumeric", actual_text AS "actualText", actual_date AS "actualDate", unit, tolerance_min::float AS "toleranceMin", tolerance_max::float AS "toleranceMax", notes FROM production_run_process_values ORDER BY production_run_id, created_at`),
      getPool().query(`SELECT id, production_run_id AS "productionRunId", formulation_component_id AS "formulationComponentId", material_lot_id AS "materialLotId", is_primary AS "isPrimary" FROM production_run_material_lots ORDER BY production_run_id, created_at`),
      getPool().query(`SELECT id, production_run_id AS "productionRunId", note_type AS "noteType", note_text AS "noteText", entered_by AS "enteredBy", created_at AS "createdAt" FROM production_run_notes ORDER BY production_run_id, created_at`),
      getPool().query(`SELECT id, production_run_id AS "productionRunId", sample_code AS "sampleCode", cavity_number AS "cavityNumber", status::text AS status, created_at AS "createdAt" FROM samples ORDER BY sample_code`),
      getPool().query(`SELECT id, method_code AS "methodCode", method_name AS "methodName", metric_id AS "metricId", cure_hours::float AS "cureHours", description, status::text AS status FROM test_method_definitions ORDER BY method_code`),
      getPool().query(`SELECT id, condition_code AS "conditionCode", condition_name AS "conditionName", description, status::text AS status FROM test_condition_definitions ORDER BY condition_code`),
      getPool().query(`SELECT id, sample_id AS "sampleId", metric_id AS "metricId", test_method_id AS "testMethodId", value_numeric::float AS value, unit, tested_by AS "testedBy", tested_at AS "testedAt" FROM sample_test_results ORDER BY tested_at DESC`),
      getPool().query(`SELECT id, sample_id AS "sampleId", metric_id AS "metricId", test_condition_id AS "testConditionId", test_method_id AS "testMethodId", value_numeric::float AS value, unit, tested_by AS "testedBy", tested_at AS "testedAt" FROM environmental_test_results ORDER BY tested_at DESC`),
      getPool().query(`SELECT id, sample_id AS "sampleId", observation_type AS "observationType", observation_text AS "observationText", observed_by AS "observedBy", observed_at AS "observedAt" FROM sample_observations ORDER BY observed_at DESC`),
      getPool().query(`SELECT id, sample_id AS "sampleId", metric_id AS "metricId", rating_value::float AS "ratingValue", feedback_text AS "feedbackText", rated_by AS "ratedBy", rated_at AS "ratedAt" FROM sample_subjective_ratings ORDER BY rated_at DESC`),
      getPool().query(`SELECT id, benchmark_code AS "benchmarkCode", benchmark_name AS "benchmarkName", profile_version AS "profileVersion", status::text AS status, notes FROM benchmark_profiles ORDER BY benchmark_code`),
      getPool().query(`SELECT id, COALESCE(benchmark_profile_id, benchmark_id) AS "benchmarkId", metric_id AS "metricId", condition_id AS "conditionId", metric_name AS "metricName", metric_category AS "metricCategory", target_mean::float AS "targetMean", min_acceptable::float AS "minAcceptable", max_acceptable::float AS "maxAcceptable", unit, weight::float AS weight, criticality, notes FROM benchmark_metric_targets ORDER BY "benchmarkId", metric_name`),
    ]);
    const materialRows = materials.rows.map((material) => ({
      ...material,
      materialProperties: properties.rows.filter((property) => property.materialId === material.id).length,
    }));
    return {
      Formulations: formulations.rows as ReportRecord[], Materials: materialRows as ReportRecord[], Suppliers: suppliers.rows as ReportRecord[],
      'Property Definitions': definitions.rows as ReportRecord[], 'Material Properties': properties.rows as ReportRecord[],
      'Supplier Materials': supplierMaterials.rows as ReportRecord[], 'Material Lots': lots.rows as ReportRecord[],
      'Formulation Components': components.rows as ReportRecord[], 'Production Runs': runs.rows as ReportRecord[],
      Machines: machines.rows as ReportRecord[], 'Machine Capabilities': machineCapabilities.rows as ReportRecord[],
      Molds: molds.rows as ReportRecord[], 'Mold Zones': moldZones.rows as ReportRecord[],
      'Process Parameter Definitions': parameterDefinitions.rows as ReportRecord[], 'Process Setup Revisions': setupRevisions.rows as ReportRecord[],
      'Process Setup Parameters': setupParameters.rows as ReportRecord[], 'Production Run Process Values': runValues.rows as ReportRecord[],
      'Production Run Material Lots': runLots.rows as ReportRecord[], 'Production Run Notes': runNotes.rows as ReportRecord[],
      Samples: samples.rows as ReportRecord[], 'Metric Definitions': definitions.rows as ReportRecord[],
      'Test Method Definitions': testMethods.rows as ReportRecord[], 'Test Condition Definitions': testConditions.rows as ReportRecord[],
      'Sample Test Results': sampleResults.rows as ReportRecord[], 'Environmental Test Results': environmentalResults.rows as ReportRecord[],
      'Sample Observations': observations.rows as ReportRecord[], 'Sample Ratings': ratings.rows as ReportRecord[],
      'Benchmark Profiles': benchmarks.rows as ReportRecord[], 'Benchmark Metric Targets': benchmarkTargets.rows as ReportRecord[],
    };
  }

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
      getPool().query(`SELECT id, formulation_code AS "formulationCode", version_no AS "version", status::text AS status, target_benchmark_id AS "targetBenchmarkId", notes, created_at AS "createdAt", updated_at AS "updatedAt" FROM formulations WHERE id = $1`, [formulationId]),
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
    const materialRows = materials.rows.map((material) => ({
      ...material,
      materialProperties: properties.rows.filter((property) => property.materialId === material.id).length,
    }));

    return {
      Formulations: formulations.rows as ReportRecord[],
      Materials: materialRows as ReportRecord[],
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
