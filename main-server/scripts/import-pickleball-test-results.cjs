const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { Client } = require('pg');
const XLSX = require('xlsx');
const { METRIC_MAPPINGS, normalizeKey, normalizeLabel, parseWorkbook } = require('./lib/pickleball-workbook.cjs');

const DEFAULT_WORKBOOK = 'D:\\CCP\\Pickleball Testing Results Amerilabs.xlsx';
const DEFAULT_PROFILE_CODE = 'BOY-125E-KINGFA-HR';
const DEFAULT_MOLD_CODE = 'BOY-125E-MOLD';
const DEFAULT_DATE_PRODUCED = '2026-08-06';
const IMPORT_ACTOR = 'codex-dev-amerilabs-import';
const LEGACY_SUPPLIER = 'Unspecified Supplier — Amerilabs Workbook';

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

async function productionContext(client, profileCode, moldCode) {
  const result = await client.query(
    `SELECT msp.id AS machine_setup_profile_id, msp.machine_id, msp.parameters,
            mo.id AS mold_id
     FROM machine_setup_profiles msp
     JOIN molds mo ON mo.mold_code = $2 AND mo.status = 'active'
     WHERE msp.profile_code = $1 AND msp.status = 'active'`,
    [profileCode, moldCode]
  );
  if (result.rowCount !== 1) throw new Error(`Expected one active setup profile ${profileCode} and mold ${moldCode}`);
  const row = result.rows[0];
  const parameters = Array.isArray(row.parameters) ? row.parameters : [];
  const value = (key, positionLabel) => {
    const item = parameters.find((entry) => entry.key === key && entry.positionLabel === positionLabel);
    const numeric = Number(item?.value);
    return Number.isFinite(numeric) ? numeric : null;
  };
  return {
    ...row,
    injectionPressure: value('injection.pressure', 'Stage 1'),
    meltTemperature: value('barrel.temperature', 'Front Zone') ?? value('barrel.temperature', 'Nozzle'),
    coolingTime: value('cycle.cooling_time', 'Single'),
    cycleTime: value('cycle.total_time', 'Single'),
  };
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

async function ensureFormulation(client, sheet, componentRecords, workbookName, counters) {
  const existing = await client.query(
    `SELECT id, status::text, notes
     FROM formulations
     WHERE lower(trim(formulation_code)) = lower($1) AND version_no = 1
     LIMIT 1`,
    [sheet.sheetName]
  );
  const formulationCode = sheet.sheetName.toUpperCase();
  const sourceNote = `Imported from ${workbookName}; worksheet ${sheet.sheetName}.`;
  let formulationId;
  let action;
  if (existing.rowCount) {
    formulationId = existing.rows[0].id;
    action = 'UPDATE';
    await client.query(
      `UPDATE formulations
       SET formulation_code = $2, formulation_name = $3, status = 'approved',
           approved_by = $4, notes = COALESCE(NULLIF(notes, ''), $5), updated_at = now()
       WHERE id = $1`,
      [formulationId, formulationCode, sheet.sheetName, IMPORT_ACTOR, sourceNote]
    );
    counters.formulationsUpdated += 1;
  } else {
    const inserted = await client.query(
      `INSERT INTO formulations
        (formulation_code, formulation_name, version_no, status, notes, approved_by)
       VALUES ($1, $2, 1, 'approved', $3, $4)
       RETURNING id`,
      [formulationCode, sheet.sheetName, sourceNote, IMPORT_ACTOR]
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
    status: 'approved',
    sourceFile: workbookName,
    components: componentRecords.map(({ component, material }) => ({
      materialId: material.id,
      role: component.role,
      percentComposition: component.percentComposition,
    })),
  });
  return formulationId;
}

async function ensureRun(client, context, formulationId, sheetName, dateProduced, counters) {
  const runCode = datedRunCode(sheetName, dateProduced);
  const existing = await client.query('SELECT id FROM production_runs WHERE run_code = $1', [runCode]);
  const result = await client.query(
    `INSERT INTO production_runs
      (run_code, formulation_id, date_produced, machine_id, machine_setup_profile_id, mold_id,
       job_name, part_number, operator_name, shift_code, injection_pressure, injection_pressure_unit,
       melt_temperature, melt_temperature_unit, cooling_time, cooling_time_unit, cycle_time,
       cycle_time_unit, cure_hours_before_test, status)
     VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, 'psi',
             $12, 'F', $13, 'sec', $14, 'sec', 72, 'testing')
     ON CONFLICT (run_code) DO UPDATE SET
       formulation_id = EXCLUDED.formulation_id, date_produced = EXCLUDED.date_produced,
       machine_id = EXCLUDED.machine_id, mold_id = EXCLUDED.mold_id,
       machine_setup_profile_id = EXCLUDED.machine_setup_profile_id, job_name = EXCLUDED.job_name,
       part_number = EXCLUDED.part_number, operator_name = EXCLUDED.operator_name,
       shift_code = EXCLUDED.shift_code, injection_pressure = EXCLUDED.injection_pressure,
       injection_pressure_unit = EXCLUDED.injection_pressure_unit,
       melt_temperature = EXCLUDED.melt_temperature, melt_temperature_unit = EXCLUDED.melt_temperature_unit,
       cooling_time = EXCLUDED.cooling_time, cooling_time_unit = EXCLUDED.cooling_time_unit,
       cycle_time = EXCLUDED.cycle_time, cycle_time_unit = EXCLUDED.cycle_time_unit,
       cure_hours_before_test = EXCLUDED.cure_hours_before_test, status = 'testing', updated_at = now()
     RETURNING id`,
    [
      runCode, formulationId, dateProduced, context.machine_id, context.machine_setup_profile_id,
      context.mold_id, `${sheetName} Pickleball Testing`, sheetName, IMPORT_ACTOR, 'DEV',
      context.injectionPressure, context.meltTemperature, context.coolingTime, context.cycleTime,
    ]
  );
  const runId = result.rows[0].id;
  if (existing.rowCount) counters.runsUpdated += 1;
  else {
    counters.runsCreated += 1;
    await audit(client, 'production_runs', runId, 'INSERT', null, { runCode, formulationId, setupProfileId: context.machine_setup_profile_id });
  }
  return { id: runId, runCode };
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

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStandardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

async function ensureBenchmark(client, sheet, metricResolutions, workbookName, counters) {
  const existing = await client.query(
    `SELECT id, benchmark_code, benchmark_name, status::text
     FROM benchmark_profiles
     WHERE lower(trim(benchmark_name)) = lower($1)
        OR lower(trim(COALESCE(ball_model, ''))) = lower($1)
     ORDER BY created_at
     LIMIT 1`,
    [sheet.sheetName]
  );
  const benchmarkCode = existing.rows[0]?.benchmark_code || `${slug(sheet.sheetName).slice(0, 120)}-BN`;
  const notes = `Test-only benchmark identified in ${workbookName}; worksheet ${sheet.sheetName}.`;
  let benchmarkId;
  if (existing.rowCount) {
    benchmarkId = existing.rows[0].id;
    await client.query(
      `UPDATE benchmark_profiles
       SET name = $2::text, benchmark_name = $2::varchar, ball_brand = $2::varchar, ball_model = $2::varchar,
           description = $3, notes = $3, is_active = true, status = 'active', updated_at = now()
       WHERE id = $1`,
      [benchmarkId, sheet.sheetName, notes]
    );
    counters.benchmarksUpdated += 1;
  } else {
    const inserted = await client.query(
      `INSERT INTO benchmark_profiles
        (name, description, ball_brand, ball_model, is_active, benchmark_code,
         benchmark_name, profile_version, status, notes)
       VALUES ($1::text, $2, $1::varchar, $1::varchar, true, $3, $1::varchar, 1, 'active', $2)
       RETURNING id`,
      [sheet.sheetName, notes, benchmarkCode]
    );
    benchmarkId = inserted.rows[0].id;
    counters.benchmarksCreated += 1;
  }

  await client.query('DELETE FROM benchmark_metric_targets WHERE benchmark_profile_id = $1', [benchmarkId]);
  const byMetric = new Map();
  for (const result of sheet.results) {
    const values = byMetric.get(result.metricKey) || [];
    values.push(result.value);
    byMetric.set(result.metricKey, values);
  }
  for (const [metricKey, values] of byMetric) {
    const resolution = metricResolutions.get(metricKey);
    const mapping = METRIC_MAPPINGS.find((item) => item.metricKey === metricKey);
    await client.query(
      `INSERT INTO benchmark_metric_targets
        (benchmark_profile_id, metric_id, metric_name, metric_category, target_value,
         target_mean, standard_deviation, target_std_dev, min_acceptable, max_acceptable,
         weight, criticality, unit, notes, required_for_pass, comparison_mode)
       SELECT $1, md.id, md.metric_key, md.category::text, $3, $3, $4, $4, $5, $6,
              0, 'medium', $7, $8, false, 'target_range'
       FROM metric_definitions md
       WHERE md.id = $2`,
      [
        benchmarkId,
        resolution.metricId,
        average(values),
        sampleStandardDeviation(values),
        Math.min(...values),
        Math.max(...values),
        mapping.unit,
        `${values.length} result(s) from ${workbookName}; worksheet ${sheet.sheetName}.`,
      ]
    );
    counters.benchmarkTargetsCreated += 1;
  }
  await audit(client, 'benchmark_profiles', benchmarkId, existing.rowCount ? 'UPDATE' : 'INSERT', existing.rows[0] ?? null, {
    benchmarkCode,
    benchmarkName: sheet.sheetName,
    metricTargets: byMetric.size,
    sourceFile: workbookName,
  });
}

async function prepareRunForScoring(client, runId, runCode, counters) {
  await client.query('DELETE FROM run_metric_summaries WHERE production_run_id = $1', [runId]);
  await client.query(
    `INSERT INTO run_metric_summaries
      (production_run_id, metric_id, condition_id, n_samples, mean_value, std_dev,
       min_value, max_value, unit, source_table)
     SELECT s.production_run_id, str.metric_id, NULL, COUNT(*)::int,
            AVG(str.value_numeric), COALESCE(STDDEV_SAMP(str.value_numeric), 0),
            MIN(str.value_numeric), MAX(str.value_numeric),
            COALESCE(NULLIF(str.unit, ''), md.default_unit), 'sample_test_results'
     FROM sample_test_results str
     JOIN samples s ON s.id = str.sample_id
     JOIN metric_definitions md ON md.id = str.metric_id
     WHERE s.production_run_id = $1
     GROUP BY s.production_run_id, str.metric_id, COALESCE(NULLIF(str.unit, ''), md.default_unit)`,
    [runId]
  );
  const missing = await client.query(
    `SELECT md.metric_key
     FROM metric_definitions md
     WHERE md.required_for_scoring = true AND md.status = 'active'
       AND EXISTS (
         SELECT 1
         FROM samples s
         WHERE s.production_run_id = $1 AND s.status <> 'archived'
           AND NOT EXISTS (
             SELECT 1
             FROM sample_test_results str
             WHERE str.sample_id = s.id AND str.metric_id = md.id
           )
       )
     ORDER BY md.sort_order, md.metric_key`,
    [runId]
  );
  const scoringReady = missing.rowCount === 0;
  await client.query(
    `UPDATE production_runs SET status = $2::production_run_status, updated_at = now() WHERE id = $1`,
    [runId, scoringReady ? 'scored' : 'testing']
  );
  if (scoringReady) counters.runsReadyForScoring += 1;
  else counters.incompleteRuns.push({ runCode, missingMetrics: missing.rows.map((row) => row.metric_key) });
}

function createCounters() {
  return {
    materialsCreated: 0,
    benchmarksCreated: 0,
    benchmarksUpdated: 0,
    benchmarkTargetsCreated: 0,
    formulationsCreated: 0,
    formulationsUpdated: 0,
    runsCreated: 0,
    runsUpdated: 0,
    samplesCreated: 0,
    samplesUpdated: 0,
    resultsCreated: 0,
    resultsUpdated: 0,
    runsReadyForScoring: 0,
    incompleteRuns: [],
  };
}

async function main() {
  const workbookPath = path.resolve(argument('workbook', DEFAULT_WORKBOOK));
  const profileCode = argument('profile-code', DEFAULT_PROFILE_CODE);
  const moldCode = argument('mold-code', DEFAULT_MOLD_CODE);
  const dateProduced = argument('date-produced', DEFAULT_DATE_PRODUCED);
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
    source.benchmarks = source.benchmarks.filter((sheet) => normalizeKey(sheet.sheetName) === normalizeKey(sheetFilter));
    if (source.formulations.length + source.benchmarks.length !== 1) throw new Error(`Importable worksheet not found: ${sheetFilter}`);
    source.totals.formulations = source.formulations.length;
    source.totals.benchmarks = source.benchmarks.length;
    const selected = source.formulations[0] || source.benchmarks[0];
    source.totals.samples = source.formulations[0]?.sampleColumns.length || 0;
    source.totals.results = selected.results.length;
  }

  const stats = createCounters();
  const client = new Client(clientConfig());
  await client.connect();
  try {
    await client.query('BEGIN');
    const context = await productionContext(client, profileCode, moldCode);
    const supplierId = await ensureLegacySupplier(client);
    const metricResolutions = new Map();
    for (const mapping of METRIC_MAPPINGS) {
      metricResolutions.set(mapping.metricKey, await ensureMetricAndMethod(client, mapping, source.workbookName));
    }

    for (const sheet of source.benchmarks) {
      await ensureBenchmark(client, sheet, metricResolutions, source.workbookName, stats);
    }

    for (const sheet of source.formulations) {
      const componentRecords = [];
      for (const component of sheet.components) {
        const material = await ensureMaterial(client, component, supplierId, source.workbookName, stats);
        componentRecords.push({ component, material });
      }
      const formulationId = await ensureFormulation(client, sheet, componentRecords, source.workbookName, stats);
      const run = await ensureRun(client, context, formulationId, sheet.sheetName, dateProduced, stats);
      const sampleRecords = await ensureSamples(client, run, sheet.sampleColumns, stats);
      await importResults(client, sheet, sampleRecords, metricResolutions, source.workbookName, stats);
      await prepareRunForScoring(client, run.id, run.runCode, stats);
    }

    if (apply) await client.query('COMMIT');
    else await client.query('ROLLBACK');
    console.log(JSON.stringify({
      mode: apply ? 'applied' : 'dry-run',
      environment: process.env.APP_ENV,
      workbook: workbookPath,
      profileCode,
      moldCode,
      dateProduced,
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
