const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { Client } = require('pg');
const XLSX = require('xlsx');

const DEFAULT_WORKBOOK = 'D:\\CCP\\Pickleball Testing 7.5.xlsx';
const DEFAULT_SHEET = 'Kingfa 1789';
const DEFAULT_RUN_CODE = 'KINGFA-1789-RUN-20260806';
const IMPORT_ACTOR = 'codex-dev-import';

const metricMappings = [
  { sourceLabel: 'Weight', metricKey: 'weight', unit: 'g', methodCode: 'WEIGHT_STANDARD' },
  {
    sourceLabel: 'Compression @ 1/4 inch',
    metricKey: 'compression_force_025_in',
    displayName: 'Compression Force @ 0.25 in',
    category: 'performance',
    unit: 'lbf',
    methodCode: 'PICKLEBALL_COMPRESSION_FORCE_025IN_LEGACY',
    methodName: 'Pickleball Compression Force at 0.25 in — Legacy Workbook',
    sortOrder: 81,
  },
  {
    sourceLabel: 'Stretch @ 1/4 inch',
    metricKey: 'stretch_force_025_in',
    displayName: 'Stretch Force @ 0.25 in',
    category: 'performance',
    unit: 'lbf',
    methodCode: 'PICKLEBALL_STRETCH_FORCE_025IN_LEGACY',
    methodName: 'Pickleball Stretch Force at 0.25 in — Legacy Workbook',
    sortOrder: 82,
  },
  {
    sourceLabel: 'Full Stretch max',
    metricKey: 'full_stretch_max_force',
    displayName: 'Full Stretch Maximum Force',
    category: 'performance',
    unit: 'lbf',
    methodCode: 'PICKLEBALL_FULL_STRETCH_MAX_LEGACY',
    methodName: 'Pickleball Full Stretch Maximum — Legacy Workbook',
    sortOrder: 83,
  },
  { sourceLabel: 'Hardness', metricKey: 'hardness', unit: 'Shore D', methodCode: 'HARDNESS_STANDARD' },
  { sourceLabel: 'Wall Thickness', metricKey: 'wall_thickness', unit: 'mm', methodCode: 'WALL_THICKNESS_STANDARD' },
  { sourceLabel: 'Diameter', metricKey: 'diameter', unit: 'mm', methodCode: 'DIAMETER_STANDARD' },
  {
    sourceLabel: 'Drop Test',
    metricKey: 'drop_test_legacy',
    displayName: 'Drop Test — Legacy Reading',
    category: 'performance',
    unit: null,
    methodCode: 'PICKLEBALL_DROP_TEST_LEGACY',
    methodName: 'Pickleball Drop Test — Legacy Workbook',
    sortOrder: 84,
  },
];

function argument(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function normalizeLabel(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function numericValue(value, address) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value ?? '').trim().match(/^-?\d+(?:\.\d+)?/);
  if (!match) throw new Error(`Expected a numeric result at ${address}`);
  return Number(match[0]);
}

function loadSource(workbookPath, sheetName) {
  if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);
  const workbook = XLSX.readFile(workbookPath, { cellFormula: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Worksheet not found: ${sheetName}`);

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const samples = [];
  for (let column = 1; column <= range.e.c; column += 1) {
    const address = XLSX.utils.encode_cell({ r: 0, c: column });
    const label = normalizeLabel(sheet[address]?.v);
    if (/^Sample \d+$/i.test(label)) samples.push({ column, label });
  }
  if (samples.length === 0) throw new Error(`No sample columns found in worksheet: ${sheetName}`);

  const rowsByLabel = new Map();
  for (let row = 1; row <= range.e.r; row += 1) {
    const label = normalizeLabel(sheet[XLSX.utils.encode_cell({ r: row, c: 0 })]?.v);
    if (label) rowsByLabel.set(label.toLowerCase(), row);
  }

  const results = [];
  for (const mapping of metricMappings) {
    const row = rowsByLabel.get(mapping.sourceLabel.toLowerCase());
    if (row === undefined) throw new Error(`Missing metric row: ${mapping.sourceLabel}`);
    for (const sample of samples) {
      const address = XLSX.utils.encode_cell({ r: row, c: sample.column });
      const raw = sheet[address]?.v;
      if (raw === null || raw === undefined || raw === '') continue;
      results.push({ ...mapping, sampleLabel: sample.label, sourceCell: address, value: numericValue(raw, address) });
    }
  }
  return { results, samples };
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

async function audit(client, tableName, recordId, action, oldValues, newValues) {
  await client.query(
    `INSERT INTO audit_log (table_name, record_id, action, changed_by, old_values, new_values)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [tableName, recordId, action, IMPORT_ACTOR, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null]
  );
}

async function resolveRun(client, runCode, sheetName) {
  const result = await client.query(
    `SELECT pr.id, pr.run_code, pr.status::text, f.formulation_code
     FROM production_runs pr
     JOIN formulations f ON f.id = pr.formulation_id
     WHERE pr.run_code = $1`,
    [runCode]
  );
  if (result.rowCount !== 1) throw new Error(`Expected one production run with code ${runCode}`);
  const run = result.rows[0];
  if (normalizeLabel(run.formulation_code).toLowerCase() !== normalizeLabel(sheetName).toLowerCase()) {
    throw new Error(`Run formulation '${run.formulation_code}' does not match worksheet '${sheetName}'`);
  }
  return run;
}

async function ensureMetricAndMethod(client, mapping) {
  if (mapping.displayName) {
    await client.query(
      `INSERT INTO metric_definitions
        (metric_key, display_name, category, default_unit, data_type, benchmark_comparable,
         required_for_scoring, higher_is_better, status, sort_order)
       VALUES ($1, $2, $3::metric_category, $4, 'numeric', false, false, NULL, 'active', $5)
       ON CONFLICT (metric_key) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           category = EXCLUDED.category,
           default_unit = EXCLUDED.default_unit,
           benchmark_comparable = false,
           required_for_scoring = false,
           status = 'active',
           sort_order = EXCLUDED.sort_order,
           updated_at = now()`,
      [mapping.metricKey, mapping.displayName, mapping.category, mapping.unit, mapping.sortOrder]
    );
  }

  const metricResult = await client.query(
    `SELECT id, metric_key FROM metric_definitions WHERE metric_key = $1 AND status = 'active'`,
    [mapping.metricKey]
  );
  if (metricResult.rowCount !== 1) throw new Error(`Metric not found: ${mapping.metricKey}`);
  const metricId = metricResult.rows[0].id;

  if (mapping.methodName) {
    await client.query(
      `INSERT INTO test_method_definitions
        (method_code, method_name, metric_id, description, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (method_code) DO UPDATE
       SET method_name = EXCLUDED.method_name,
           metric_id = EXCLUDED.metric_id,
           description = EXCLUDED.description,
           status = 'active',
           updated_at = now()`,
      [mapping.methodCode, mapping.methodName, metricId, 'Source: Pickleball Testing 7.5.xlsx']
    );
  }

  const methodResult = await client.query(
    `SELECT id FROM test_method_definitions WHERE method_code = $1 AND metric_id = $2 AND status = 'active'`,
    [mapping.methodCode, metricId]
  );
  if (methodResult.rowCount !== 1) throw new Error(`Test method not found: ${mapping.methodCode}`);
  return { metricId, methodId: methodResult.rows[0].id };
}

async function ensureSamples(client, run, samples) {
  const resolved = new Map();
  for (const sample of samples) {
    const sampleNumber = Number(sample.label.match(/\d+/)?.[0]);
    const sampleCode = `${run.run_code}-S${String(sampleNumber).padStart(2, '0')}`;
    const existing = await client.query(
      `SELECT id, production_run_id, sample_code FROM samples WHERE sample_code = $1`,
      [sampleCode]
    );
    if (existing.rowCount === 1) {
      if (existing.rows[0].production_run_id !== run.id) throw new Error(`Sample code belongs to another run: ${sampleCode}`);
      resolved.set(sample.label, existing.rows[0]);
      continue;
    }
    const inserted = await client.query(
      `INSERT INTO samples (production_run_id, sample_code, status)
       VALUES ($1, $2, 'testing')
       RETURNING id, production_run_id, sample_code`,
      [run.id, sampleCode]
    );
    const record = inserted.rows[0];
    await audit(client, 'samples', record.id, 'INSERT', null, record);
    resolved.set(sample.label, record);
  }
  return resolved;
}

async function importResults(client, source, run, sampleRecords, workbookName, sheetName) {
  const resolutions = new Map();
  for (const mapping of metricMappings) {
    resolutions.set(mapping.metricKey, await ensureMetricAndMethod(client, mapping));
  }

  let inserted = 0;
  let updated = 0;
  for (const item of source.results) {
    const sample = sampleRecords.get(item.sampleLabel);
    const resolution = resolutions.get(item.metricKey);
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
       ON CONFLICT (sample_id, metric_id, test_method_id) DO UPDATE
       SET value_numeric = EXCLUDED.value_numeric,
           unit = EXCLUDED.unit,
           tested_by = EXCLUDED.tested_by,
           tested_at = EXCLUDED.tested_at,
           audit_reason = EXCLUDED.audit_reason,
           updated_at = now()
       RETURNING id, sample_id, metric_id, test_method_id, value_numeric::float, unit`,
      [
        sample.id,
        resolution.metricId,
        resolution.methodId,
        item.value,
        item.unit,
        IMPORT_ACTOR,
        `Imported from ${workbookName}; worksheet ${sheetName}; cell ${item.sourceCell}`,
      ]
    );
    const record = result.rows[0];
    if (existing.rowCount === 0) inserted += 1;
    else updated += 1;
    await audit(client, 'sample_test_results', record.id, existing.rowCount === 0 ? 'INSERT' : 'UPDATE', existing.rows[0] ?? null, record);
  }
  return { inserted, updated };
}

async function main() {
  const workbookPath = path.resolve(argument('workbook', DEFAULT_WORKBOOK));
  const sheetName = argument('sheet', DEFAULT_SHEET);
  const runCode = argument('run-code', DEFAULT_RUN_CODE);
  const envPath = path.resolve(__dirname, '..', '.env.development');
  dotenv.config({ path: envPath });
  if (!['dev', 'development', ''].includes((process.env.APP_ENV || '').toLowerCase())) {
    throw new Error('This importer is restricted to development environments');
  }

  const source = loadSource(workbookPath, sheetName);
  const client = new Client(clientConfig());
  await client.connect();
  try {
    await client.query('BEGIN');
    const run = await resolveRun(client, runCode, sheetName);
    const sampleRecords = await ensureSamples(client, run, source.samples);
    const counts = await importResults(client, source, run, sampleRecords, path.basename(workbookPath), sheetName);

    if (run.status !== 'testing') {
      await client.query(`UPDATE production_runs SET status = 'testing', updated_at = now() WHERE id = $1`, [run.id]);
      await audit(client, 'production_runs', run.id, 'UPDATE', { status: run.status }, { status: 'testing', reason: 'Legacy test result import' });
    }
    await client.query(`UPDATE samples SET status = 'testing', updated_at = now() WHERE production_run_id = $1`, [run.id]);
    await client.query('COMMIT');

    console.log(JSON.stringify({
      workbook: workbookPath,
      sheet: sheetName,
      runCode,
      samples: source.samples.length,
      sourceResults: source.results.length,
      ...counts,
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
