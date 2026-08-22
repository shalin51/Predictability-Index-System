const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { Client } = require('pg');
const XLSX = require('xlsx');
const { METRIC_MAPPINGS, normalizeKey, normalizeLabel, parseWorkbook } = require('./lib/pickleball-workbook.cjs');

const DEFAULT_WORKBOOK = 'D:\\CCP\\Pickleball Testing Results Amerilabs.xlsx';
const DEFAULT_REFERENCE_RUN = 'KINGFA-1789-RUN-20260806';
const IMPORT_ACTOR = 'codex-dev-amerilabs-import';
const LEGACY_SUPPLIER = 'Unspecified Supplier — Amerilabs Workbook';
const EXPERIMENT_NAME = 'Amerilabs Pickleball Formulation Testing';
const FAMILY_NAME = 'Amerilabs Pickleball Formulations';

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function clientConfig() {
  const ssl = process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false;
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL, ssl };
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'AMFPI',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl,
  };
}

function slug(value) {
  return normalizeLabel(value).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function datedRunCode(sheetName, dateProduced) {
  const date = new Date(dateProduced).toISOString().slice(0, 10).replaceAll('-', '');
  const hash = crypto.createHash('sha256').update(normalizeKey(sheetName)).digest('hex').slice(0, 6).toUpperCase();
  return `${slug(sheetName).slice(0, 105)}-${hash}-${date}`;
}

function legacyMaterialCode(role, materialLabel) {
  const hash = crypto.createHash('sha256').update(`${role}:${normalizeKey(materialLabel)}`).digest('hex').slice(0, 8).toUpperCase();
  return `${slug(materialLabel).slice(0, 70)}-${hash}`;
}

async function audit(client, tableName, recordId, action, oldValues, newValues) {
  await client.query(
    `INSERT INTO audit_log (table_name, record_id, action, changed_by, old_values, new_values)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [tableName, recordId, action, IMPORT_ACTOR, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null]
  );
}

async function referenceRun(client, runCode) {
  const result = await client.query(
    `SELECT pr.*, f.formulation_code
     FROM production_runs pr
     JOIN formulations f ON f.id = pr.formulation_id
     WHERE pr.run_code = $1`,
    [runCode]
  );
  if (result.rowCount !== 1) throw new Error(`Expected one reference production run with code ${runCode}`);
  if (!result.rows[0].process_setup_revision_id) throw new Error(`Reference run ${runCode} has no process setup revision`);
  return result.rows[0];
}

async function ensureExperimentAndFamily(client) {
  const experiment = await client.query(
    `INSERT INTO experiments (experiment_code, experiment_name, status)
     VALUES ('PICKLEBALL', $1, 'active')
     ON CONFLICT (experiment_name) DO UPDATE SET status = 'active', updated_at = now()
     RETURNING id`,
    [EXPERIMENT_NAME]
  );
  const family = await client.query(
    `INSERT INTO formulation_families (family_name, status)
     VALUES ($1, 'active')
     ON CONFLICT (family_name) DO UPDATE SET status = 'active', updated_at = now()
     RETURNING id`,
    [FAMILY_NAME]
  );
  return { experimentId: experiment.rows[0].id, familyId: family.rows[0].id };
}

async function ensureLegacySupplier(client) {
  const existing = await client.query(
    `SELECT id FROM suppliers WHERE lower(trim(COALESCE(supplier_name, name))) = lower($1) LIMIT 1`,
    [LEGACY_SUPPLIER]
  );
  if (existing.rowCount) return existing.rows[0].id;
  const inserted = await client.query(
    `INSERT INTO suppliers
      (name, supplier_name, supplier_code, supplier_type, supplier_role, notes, status)
     VALUES ($1::text, $1::varchar, 'SUP-UNSPEC', 'unspecified', 'Source workbook placeholder',
             'Supplier was not identified in the Amerilabs workbook.', 'active')
     RETURNING id`,
    [LEGACY_SUPPLIER]
  );
  await audit(client, 'suppliers', inserted.rows[0].id, 'INSERT', null, { name: LEGACY_SUPPLIER });
  return inserted.rows[0].id;
}

async function knownMaterial(client, component) {
  if (component.role !== 'additive') return null;
  const key = normalizeKey(component.materialLabel).replace(/[^a-z0-9]/g, '');
  const materialCode = key === '7033' || key === '7033n'
    ? 'MAT-008'
    : key === 'vistamax' || key === 'vistamaxx'
      ? 'MAT-002'
      : key === 'exact'
        ? 'MAT-004'
        : null;
  if (!materialCode) return null;
  const result = await client.query(
    `SELECT id, supplier_id FROM materials WHERE material_code = $1 AND status = 'active'`,
    [materialCode]
  );
  if (result.rowCount !== 1) throw new Error(`Required catalog material is missing: ${materialCode}`);
  return result.rows[0];
}

async function ensureMaterial(client, component, supplierId, workbookName, counters) {
  const mapped = await knownMaterial(client, component);
  if (mapped) return mapped;
  const materialType = component.role === 'base' ? 'polymer' : component.role === 'color' ? 'colorant' : 'additive';
  const existing = await client.query(
    `SELECT id, supplier_id
     FROM materials
     WHERE lower(trim(COALESCE(material_name, name))) = lower($1)
       AND material_type = $2
     LIMIT 1`,
    [component.materialLabel, materialType]
  );
  if (existing.rowCount) return { id: existing.rows[0].id, supplier_id: existing.rows[0].supplier_id || supplierId };
  const materialCode = legacyMaterialCode(component.role, component.materialLabel);
  const inserted = await client.query(
    `INSERT INTO materials
      (name, material_name, material_code, material_type, supplier_id, unit, default_unit,
       description, source_file, is_active, status)
     VALUES ($1::text, $1::varchar, $2, $3, $4, 'kg', 'wt%', $5, $6, true, 'active')
     RETURNING id, supplier_id`,
    [
      component.materialLabel,
      materialCode,
      materialType,
      supplierId,
      `${component.role} material identified in ${workbookName}; supplier not specified by source.`,
      workbookName,
    ]
  );
  counters.materialsCreated += 1;
  await audit(client, 'materials', inserted.rows[0].id, 'INSERT', null, {
    materialCode,
    materialName: component.materialLabel,
    materialType,
    sourceFile: workbookName,
  });
  return inserted.rows[0];
}

async function ensureFormulation(client, sheet, componentRecords, references, workbookName, counters) {
  const existing = await client.query(
    `SELECT id, status::text, notes
     FROM formulations
     WHERE lower(trim(formulation_code)) = lower($1) AND version_no = 1
     LIMIT 1`,
    [sheet.sheetName]
  );
  const sourceNote = `Imported from ${workbookName}; worksheet ${sheet.sheetName}.`;
  let formulationId;
  let action;
  if (existing.rowCount) {
    formulationId = existing.rows[0].id;
    action = 'UPDATE';
    await client.query(
      `UPDATE formulations
       SET experiment_id = $2, family_id = $3, status = 'testing',
           notes = COALESCE(NULLIF(notes, ''), $4), updated_at = now()
       WHERE id = $1`,
      [formulationId, references.experimentId, references.familyId, sourceNote]
    );
    counters.formulationsUpdated += 1;
  } else {
    const inserted = await client.query(
      `INSERT INTO formulations
        (formulation_code, version_no, experiment_id, family_id, status, notes)
       VALUES ($1, 1, $2, $3, 'testing', $4)
       RETURNING id`,
      [sheet.sheetName, references.experimentId, references.familyId, sourceNote]
    );
    formulationId = inserted.rows[0].id;
    action = 'INSERT';
    counters.formulationsCreated += 1;
  }

  const linkedLots = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM production_run_material_lots ml
     JOIN production_runs pr ON pr.id = ml.production_run_id
     WHERE pr.formulation_id = $1`,
    [formulationId]
  );
  if (linkedLots.rows[0].count > 0) {
    throw new Error(`Cannot replace components for ${sheet.sheetName}; production-run material lots reference them`);
  }
  await client.query('DELETE FROM formulation_components WHERE formulation_id = $1', [formulationId]);
  for (const [index, item] of componentRecords.entries()) {
    await client.query(
      `INSERT INTO formulation_components
        (formulation_id, material_id, supplier_id, percent_composition, basis, sort_order)
       VALUES ($1, $2, $3, $4, 'weight_percent', $5)`,
      [formulationId, item.material.id, item.material.supplier_id, item.component.percentComposition, index]
    );
  }
  await audit(client, 'formulations', formulationId, action, existing.rows[0] ?? null, {
    formulationCode: sheet.sheetName,
    status: 'testing',
    sourceFile: workbookName,
    components: componentRecords.map(({ component, material }) => ({
      materialId: material.id,
      role: component.role,
      percentComposition: component.percentComposition,
    })),
  });
  return formulationId;
}

async function cloneProcessSetup(client, sourceRun, formulationId, counters) {
  if (formulationId === sourceRun.formulation_id) return sourceRun.process_setup_revision_id;
  const source = await client.query('SELECT * FROM process_setup_revisions WHERE id = $1', [sourceRun.process_setup_revision_id]);
  if (source.rowCount !== 1) throw new Error(`Reference process setup revision not found: ${sourceRun.process_setup_revision_id}`);
  const sourceRevision = source.rows[0];
  const revisionNo = new Date(sourceRun.date_produced).toISOString().slice(0, 10).replaceAll('-', '');
  const existing = await client.query(
    `SELECT id FROM process_setup_revisions
     WHERE machine_id = $1 AND mold_id = $2 AND formulation_id = $3 AND revision_no = $4`,
    [sourceRevision.machine_id, sourceRevision.mold_id, formulationId, revisionNo]
  );
  let revisionId;
  if (existing.rowCount) {
    revisionId = existing.rows[0].id;
    counters.setupRevisionsUpdated += 1;
  } else {
    const setupHash = crypto.createHash('sha256').update(`${sourceRevision.setup_hash}:${formulationId}`).digest('hex');
    const inserted = await client.query(
      `INSERT INTO process_setup_revisions
        (machine_id, mold_id, formulation_id, revision_no, status, setup_hash,
         hot_runner_manufacturer, hot_runner_controller_model, hot_runner_zone_count,
         approved_by_display, approved_by_actor, document_approval_date, approved_at, source_import_id)
       VALUES ($1,$2,$3,$4,'approved',$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        sourceRevision.machine_id,
        sourceRevision.mold_id,
        formulationId,
        revisionNo,
        setupHash,
        sourceRevision.hot_runner_manufacturer,
        sourceRevision.hot_runner_controller_model,
        sourceRevision.hot_runner_zone_count,
        sourceRevision.approved_by_display,
        sourceRevision.approved_by_actor,
        sourceRevision.document_approval_date,
        sourceRevision.approved_at,
        sourceRevision.source_import_id,
      ]
    );
    revisionId = inserted.rows[0].id;
    counters.setupRevisionsCreated += 1;
    await audit(client, 'process_setup_revisions', revisionId, 'INSERT', null, {
      copiedFromRevisionId: sourceRun.process_setup_revision_id,
      formulationId,
    });
  }

  await client.query('DELETE FROM process_setup_revision_parameters WHERE process_setup_revision_id = $1', [revisionId]);
  await client.query(
    `INSERT INTO process_setup_revision_parameters
      (process_setup_revision_id, parameter_definition_id, position_type, position_index, position_label,
       value_numeric, value_text, value_date, unit, tolerance_min, tolerance_max, notes, sort_order)
     SELECT $1, parameter_definition_id, position_type, position_index, position_label,
            value_numeric, value_text, value_date, unit, tolerance_min, tolerance_max, notes, sort_order
     FROM process_setup_revision_parameters
     WHERE process_setup_revision_id = $2`,
    [revisionId, sourceRun.process_setup_revision_id]
  );
  await client.query('DELETE FROM process_setup_revision_log_entries WHERE process_setup_revision_id = $1', [revisionId]);
  await client.query(
    `INSERT INTO process_setup_revision_log_entries
      (process_setup_revision_id, revision_no, revision_date, changed_by, approved_by,
       change_description, machine_status, sort_order)
     SELECT $1, revision_no, revision_date, changed_by, approved_by,
            change_description, machine_status, sort_order
     FROM process_setup_revision_log_entries
     WHERE process_setup_revision_id = $2`,
    [revisionId, sourceRun.process_setup_revision_id]
  );
  return revisionId;
}

async function ensureRun(client, sourceRun, formulationId, revisionId, sheetName, counters) {
  if (formulationId === sourceRun.formulation_id) return { id: sourceRun.id, runCode: sourceRun.run_code };
  const runCode = datedRunCode(sheetName, sourceRun.date_produced);
  const existing = await client.query('SELECT id FROM production_runs WHERE run_code = $1', [runCode]);
  const result = await client.query(
    `INSERT INTO production_runs
      (run_code, formulation_id, date_produced, machine_id, mold_id, process_setup_revision_id,
       job_name, part_number, operator_name, shift_code, injection_pressure, injection_pressure_unit,
       melt_temperature, melt_temperature_unit, cooling_time, cooling_time_unit, cycle_time,
       cycle_time_unit, cure_hours_before_test, status)
     SELECT $1, $2, date_produced, machine_id, mold_id, $3,
            $4, $5, operator_name, shift_code, injection_pressure, injection_pressure_unit,
            melt_temperature, melt_temperature_unit, cooling_time, cooling_time_unit, cycle_time,
            cycle_time_unit, cure_hours_before_test, 'testing'
     FROM production_runs WHERE id = $6
     ON CONFLICT (run_code) DO UPDATE SET
       formulation_id = EXCLUDED.formulation_id, date_produced = EXCLUDED.date_produced,
       machine_id = EXCLUDED.machine_id, mold_id = EXCLUDED.mold_id,
       process_setup_revision_id = EXCLUDED.process_setup_revision_id, job_name = EXCLUDED.job_name,
       part_number = EXCLUDED.part_number, operator_name = EXCLUDED.operator_name,
       shift_code = EXCLUDED.shift_code, injection_pressure = EXCLUDED.injection_pressure,
       injection_pressure_unit = EXCLUDED.injection_pressure_unit,
       melt_temperature = EXCLUDED.melt_temperature, melt_temperature_unit = EXCLUDED.melt_temperature_unit,
       cooling_time = EXCLUDED.cooling_time, cooling_time_unit = EXCLUDED.cooling_time_unit,
       cycle_time = EXCLUDED.cycle_time, cycle_time_unit = EXCLUDED.cycle_time_unit,
       cure_hours_before_test = EXCLUDED.cure_hours_before_test, status = 'testing', updated_at = now()
     RETURNING id`,
    [runCode, formulationId, revisionId, `${sheetName} Pickleball Testing`, sheetName, sourceRun.id]
  );
  const runId = result.rows[0].id;
  if (existing.rowCount) counters.runsUpdated += 1;
  else {
    counters.runsCreated += 1;
    await audit(client, 'production_runs', runId, 'INSERT', null, { runCode, copiedFromRunId: sourceRun.id, formulationId });
  }
  return { id: runId, runCode };
}

async function cloneRunProcessValues(client, sourceRun, targetRunId, targetRevisionId) {
  if (targetRunId === sourceRun.id) return 0;
  await client.query('DELETE FROM production_run_process_values WHERE production_run_id = $1', [targetRunId]);
  const copied = await client.query(
    `INSERT INTO production_run_process_values
      (production_run_id, setup_parameter_id, parameter_definition_id, position_type, position_index,
       position_label, setpoint_numeric, setpoint_text, setpoint_date, actual_numeric, actual_text,
       actual_date, unit, tolerance_min, tolerance_max, notes, source_import_id)
     SELECT $1, target_parameter.id, source_value.parameter_definition_id, source_value.position_type,
            source_value.position_index, source_value.position_label, source_value.setpoint_numeric,
            source_value.setpoint_text, source_value.setpoint_date, source_value.actual_numeric,
            source_value.actual_text, source_value.actual_date, source_value.unit,
            source_value.tolerance_min, source_value.tolerance_max, source_value.notes,
            source_value.source_import_id
     FROM production_run_process_values source_value
     LEFT JOIN process_setup_revision_parameters target_parameter
       ON target_parameter.process_setup_revision_id = $2
      AND target_parameter.parameter_definition_id = source_value.parameter_definition_id
      AND target_parameter.position_type = source_value.position_type
      AND target_parameter.position_index IS NOT DISTINCT FROM source_value.position_index
      AND target_parameter.position_label IS NOT DISTINCT FROM source_value.position_label
     WHERE source_value.production_run_id = $3`,
    [targetRunId, targetRevisionId, sourceRun.id]
  );
  return copied.rowCount;
}

async function ensureMetricAndMethod(client, mapping, workbookName) {
  if (mapping.displayName) {
    await client.query(
      `INSERT INTO metric_definitions
        (metric_key, display_name, category, default_unit, data_type, benchmark_comparable,
         required_for_scoring, higher_is_better, status, sort_order)
       VALUES ($1, $2, $3::metric_category, $4, 'numeric', false, false, NULL, 'active', $5)
       ON CONFLICT (metric_key) DO UPDATE SET
         display_name = EXCLUDED.display_name, category = EXCLUDED.category,
         default_unit = EXCLUDED.default_unit, benchmark_comparable = false,
         required_for_scoring = false, status = 'active', sort_order = EXCLUDED.sort_order,
         updated_at = now()`,
      [mapping.metricKey, mapping.displayName, mapping.category, mapping.unit, mapping.sortOrder]
    );
  }
  const metric = await client.query(
    `SELECT id FROM metric_definitions WHERE metric_key = $1 AND status = 'active'`,
    [mapping.metricKey]
  );
  if (metric.rowCount !== 1) throw new Error(`Metric not found: ${mapping.metricKey}`);
  if (mapping.methodName) {
    await client.query(
      `INSERT INTO test_method_definitions
        (method_code, method_name, metric_id, description, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (method_code) DO UPDATE SET
         method_name = EXCLUDED.method_name, metric_id = EXCLUDED.metric_id,
         description = EXCLUDED.description, status = 'active', updated_at = now()`,
      [mapping.methodCode, mapping.methodName, metric.rows[0].id, `Source: ${workbookName}`]
    );
  }
  const method = await client.query(
    `SELECT id FROM test_method_definitions
     WHERE method_code = $1 AND metric_id = $2 AND status = 'active'`,
    [mapping.methodCode, metric.rows[0].id]
  );
  if (method.rowCount !== 1) throw new Error(`Test method not found: ${mapping.methodCode}`);
  return { metricId: metric.rows[0].id, methodId: method.rows[0].id };
}

async function ensureSamples(client, run, sampleColumns, counters) {
  const records = new Map();
  for (const sample of sampleColumns) {
    const sampleNumber = Number(sample.label.match(/\d+/)?.[0]);
    const sampleCode = `${run.runCode}-S${String(sampleNumber).padStart(2, '0')}`;
    const existing = await client.query('SELECT id, production_run_id FROM samples WHERE sample_code = $1', [sampleCode]);
    const result = await client.query(
      `INSERT INTO samples (production_run_id, sample_code, status)
       VALUES ($1, $2, 'testing')
       ON CONFLICT (sample_code) DO UPDATE SET status = 'testing', updated_at = now()
       RETURNING id, production_run_id`,
      [run.id, sampleCode]
    );
    if (result.rows[0].production_run_id !== run.id) throw new Error(`Sample code belongs to another run: ${sampleCode}`);
    if (existing.rowCount) counters.samplesUpdated += 1;
    else {
      counters.samplesCreated += 1;
      await audit(client, 'samples', result.rows[0].id, 'INSERT', null, { productionRunId: run.id, sampleCode });
    }
    records.set(sample.label, result.rows[0]);
  }
  return records;
}

async function importResults(client, sheet, samples, metricResolutions, workbookName, counters) {
  for (const item of sheet.results) {
    const sample = samples.get(item.sampleLabel);
    const resolution = metricResolutions.get(item.metricKey);
    const existing = await client.query(
      `SELECT id, value_numeric::float AS value_numeric, unit
       FROM sample_test_results
       WHERE sample_id = $1 AND metric_id = $2 AND test_method_id = $3`,
      [sample.id, resolution.metricId, resolution.methodId]
    );
    const result = await client.query(
      `INSERT INTO sample_test_results
        (sample_id, metric_id, test_method_id, value_numeric, unit, tested_by, tested_at, audit_reason)
       VALUES ($1, $2, $3, $4, $5, $6, now(), $7)
       ON CONFLICT (sample_id, metric_id, test_method_id) DO UPDATE SET
         value_numeric = EXCLUDED.value_numeric, unit = EXCLUDED.unit,
         tested_by = EXCLUDED.tested_by, tested_at = EXCLUDED.tested_at,
         audit_reason = EXCLUDED.audit_reason, updated_at = now()
       RETURNING id, sample_id, metric_id, test_method_id, value_numeric::float, unit`,
      [sample.id, resolution.metricId, resolution.methodId, item.value, item.unit, IMPORT_ACTOR,
       `Imported from ${workbookName}; worksheet ${sheet.sheetName}; cell ${item.sourceCell}`]
    );
    const action = existing.rowCount ? 'UPDATE' : 'INSERT';
    if (existing.rowCount) counters.resultsUpdated += 1;
    else counters.resultsCreated += 1;
    await audit(client, 'sample_test_results', result.rows[0].id, action, existing.rows[0] ?? null, result.rows[0]);
  }
}

function createCounters() {
  return {
    materialsCreated: 0,
    formulationsCreated: 0,
    formulationsUpdated: 0,
    setupRevisionsCreated: 0,
    setupRevisionsUpdated: 0,
    runsCreated: 0,
    runsUpdated: 0,
    processValuesCopied: 0,
    samplesCreated: 0,
    samplesUpdated: 0,
    resultsCreated: 0,
    resultsUpdated: 0,
  };
}

async function main() {
  const workbookPath = path.resolve(argument('workbook', DEFAULT_WORKBOOK));
  const referenceRunCode = argument('reference-run-code', DEFAULT_REFERENCE_RUN);
  const sheetFilter = argument('sheet');
  const apply = process.argv.includes('--apply');
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.development') });
  if (!['dev', 'development'].includes((process.env.APP_ENV || '').toLowerCase())) {
    throw new Error('This importer is restricted to an explicit development environment');
  }
  if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);

  const source = parseWorkbook(workbookPath, XLSX);
  if (sheetFilter) {
    source.formulations = source.formulations.filter((sheet) => normalizeKey(sheet.sheetName) === normalizeKey(sheetFilter));
    if (source.formulations.length !== 1) throw new Error(`Formulation worksheet not found: ${sheetFilter}`);
    source.totals.formulations = 1;
    source.totals.samples = source.formulations[0].sampleColumns.length;
    source.totals.results = source.formulations[0].results.length;
  }

  const stats = createCounters();
  const client = new Client(clientConfig());
  await client.connect();
  try {
    await client.query('BEGIN');
    const sourceRun = await referenceRun(client, referenceRunCode);
    const references = await ensureExperimentAndFamily(client);
    const supplierId = await ensureLegacySupplier(client);
    const metricResolutions = new Map();
    for (const mapping of METRIC_MAPPINGS) {
      metricResolutions.set(mapping.metricKey, await ensureMetricAndMethod(client, mapping, source.workbookName));
    }

    for (const sheet of source.formulations) {
      const componentRecords = [];
      for (const component of sheet.components) {
        const material = await ensureMaterial(client, component, supplierId, source.workbookName, stats);
        componentRecords.push({ component, material });
      }
      const formulationId = await ensureFormulation(client, sheet, componentRecords, references, source.workbookName, stats);
      const revisionId = await cloneProcessSetup(client, sourceRun, formulationId, stats);
      const run = await ensureRun(client, sourceRun, formulationId, revisionId, sheet.sheetName, stats);
      stats.processValuesCopied += await cloneRunProcessValues(client, sourceRun, run.id, revisionId);
      const sampleRecords = await ensureSamples(client, run, sheet.sampleColumns, stats);
      await importResults(client, sheet, sampleRecords, metricResolutions, source.workbookName, stats);
    }

    if (apply) await client.query('COMMIT');
    else await client.query('ROLLBACK');
    console.log(JSON.stringify({
      mode: apply ? 'applied' : 'dry-run',
      environment: process.env.APP_ENV,
      workbook: workbookPath,
      referenceRunCode,
      sourceTotals: source.totals,
      skippedSheets: source.skipped,
      warnings: source.warnings,
      changes: stats,
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
