const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const sourcePath = path.resolve(process.argv[2] || 'D:/CCP/material_property_master_dataset.xlsx');
const outputPath = path.resolve(
  process.argv[3] || 'main-server/src/database/seeds/002_material_property_master_dataset.sql'
);

const workbook = XLSX.readFile(sourcePath, { cellDates: true });
const sourceBytes = fs.readFileSync(sourcePath);
const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const rows = (sheetName) => XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, range: 3 });
const materials = rows('Material Register');
const definitions = rows('Property Dictionary');
const facts = rows('Property Facts');

const sqlString = (value) => {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
};
const sqlDate = (value) => {
  if (!value) return 'NULL';
  const date = value instanceof Date ? value : new Date(value);
  return sqlString(date.toISOString().slice(0, 10));
};
const sqlNumber = (value) => value === null || value === undefined || value === '' ? 'NULL' : String(value);
const normalizeDate = (value) => value ? (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10) : null;
const optional = (value) => value === null || value === undefined || String(value).trim() === '' ? null : String(value).trim();

const parsedFact = (row) => ({
  materialExternalId: String(row.material_id).trim(),
  manufacturer: String(row.manufacturer).trim(),
  productGrade: String(row.product_grade).trim(),
  propertyKey: String(row.property_id).trim(),
  propertyName: String(row.property_name).trim(),
  sourceLabel: String(row.source_label).trim(),
  valueNumeric: row.value_numeric === null ? null : Number(row.value_numeric),
  valueText: optional(row.value_text),
  qualifier: optional(row.qualifier),
  unit: optional(row.unit),
  testMethod: String(row.test_method).trim(),
  testCondition: optional(row.test_condition),
  temperatureC: row.temperature_c === null ? null : Number(row.temperature_c),
  load: optional(row.load),
  duration: optional(row.duration),
  frequency: optional(row.frequency),
  direction: optional(row.direction),
  specimen: optional(row.specimen),
  processType: optional(row.process_type),
  zone: optional(row.zone),
  sourceFile: String(row.source_file).trim(),
  sourcePage: optional(row.source_page),
  sourceRevisionDate: normalizeDate(row.source_revision_date),
  notes: optional(row.notes),
});

const supplierNames = [...new Set(materials.map((row) => String(row.manufacturer).trim()))];
const supplierCodes = new Map(supplierNames.map((name, index) => [name, `SUP-${String(index + 1).padStart(3, '0')}`]));

const lines = [
  '-- Generated from material_property_master_dataset.xlsx.',
  '-- Regenerate with: node scripts/generate-material-catalog-seed.cjs <source.xlsx>',
  '-- This seed is idempotent and safe to rerun in development/test.',
  '',
  'INSERT INTO suppliers',
  '  (name, supplier_name, supplier_code, supplier_type, supplier_role, contact_info, supplier_notes, status)',
  'VALUES',
  supplierNames.map((name) => {
    const role = /lab trial/i.test(name) ? 'laboratory' : 'manufacturer';
    return `  (${sqlString(name)}, ${sqlString(name)}, ${sqlString(supplierCodes.get(name))}, ${sqlString(role)}, ${sqlString(role)}, NULL, NULL, 'active')`;
  }).join(',\n') + '\nON CONFLICT (name) DO UPDATE SET\n' +
    '  supplier_name = EXCLUDED.supplier_name, supplier_code = EXCLUDED.supplier_code,\n' +
    '  supplier_type = EXCLUDED.supplier_type, supplier_role = EXCLUDED.supplier_role, status = EXCLUDED.status;',
  '',
  'WITH material_rows(material_code, manufacturer, product_grade, chemistry, role_in_blend, source_file, source_revision_date, notes, material_type, material_lot) AS (',
  '  VALUES',
  materials.map((row) => {
    const type = /lab trial/i.test(row.manufacturer) || /blend trial/i.test(row.role_in_blend || '') ? 'lab_trial_compound' : 'polymer';
    const lot = String(row.material_id) === 'MAT-014' ? 'R-113053' : null;
    return `    (${sqlString(row.material_id)}, ${sqlString(row.manufacturer)}, ${sqlString(row.product_grade)}, ${sqlString(row.chemistry)}, ${sqlString(row.role_in_blend)}, ${sqlString(row.source_file)}, ${sqlDate(row.source_revision_date)}, ${sqlString(row.notes)}, ${sqlString(type)}, ${sqlString(lot)})`;
  }).join(',\n'),
  ')',
  'INSERT INTO materials',
  '  (name, material_type, supplier_id, unit, description, is_active, material_code, material_name, default_unit,',
  '   status, chemistry, role_in_blend, product_grade, material_lot, source_file, source_revision_date, notes)',
  'SELECT r.product_grade, r.material_type, s.id, \'wt%\', r.chemistry, true, r.material_code, r.product_grade, \'wt%\',',
  '       \'active\', r.chemistry, r.role_in_blend, r.product_grade, r.material_lot, r.source_file, r.source_revision_date::date, r.notes',
  'FROM material_rows r',
  'JOIN suppliers s ON s.supplier_name = r.manufacturer',
  'ON CONFLICT (name, material_type) DO UPDATE SET',
  '  supplier_id = EXCLUDED.supplier_id, material_code = EXCLUDED.material_code, material_name = EXCLUDED.material_name,',
  '  chemistry = EXCLUDED.chemistry, role_in_blend = EXCLUDED.role_in_blend, product_grade = EXCLUDED.product_grade,',
  '  material_lot = EXCLUDED.material_lot, source_file = EXCLUDED.source_file,',
  '  source_revision_date = EXCLUDED.source_revision_date, notes = EXCLUDED.notes, status = EXCLUDED.status;',
  '',
  "INSERT INTO material_external_identifiers (material_id, namespace, external_id)",
  "SELECT id, 'material-master-v1', material_code FROM materials WHERE material_code LIKE 'MAT-%'",
  'ON CONFLICT (namespace, external_id) DO UPDATE SET material_id = EXCLUDED.material_id;',
  '',
  'INSERT INTO supplier_materials (supplier_id, material_id, supplier_material_code, status)',
  'SELECT m.supplier_id, m.id, LEFT(regexp_replace(upper(m.product_grade), \'[^A-Z0-9]+\', \'_\', \'g\'), 100), \'active\'',
  "FROM materials m WHERE m.material_code LIKE 'MAT-%' AND m.supplier_id IS NOT NULL",
  'ON CONFLICT (supplier_id, material_id, supplier_material_code) DO UPDATE SET status = EXCLUDED.status, updated_at = now();',
  '',
  'INSERT INTO material_property_definitions',
  '  (property_key, category, canonical_name, source_labels_synonyms, condition_dimensions, common_units,',
  '   value_type, origin, implementation_notes, status)',
  'VALUES',
  definitions.map((row) => `  (${sqlString(row.property_id)}, ${sqlString(row.category)}, ${sqlString(row.canonical_property)}, ${sqlString(row.source_labels_synonyms)}, ${sqlString(row.condition_dimensions)}, ${sqlString(row.common_units)}, ${sqlString(row.value_type)}, ${sqlString(row.origin)}, ${sqlString(row.implementation_notes)}, 'active')`).join(',\n') + '\nON CONFLICT (property_key) DO UPDATE SET\n' +
    '  category = EXCLUDED.category, canonical_name = EXCLUDED.canonical_name,\n' +
    '  source_labels_synonyms = EXCLUDED.source_labels_synonyms, condition_dimensions = EXCLUDED.condition_dimensions,\n' +
    '  common_units = EXCLUDED.common_units, value_type = EXCLUDED.value_type, origin = EXCLUDED.origin,\n' +
    '  implementation_notes = EXCLUDED.implementation_notes, status = EXCLUDED.status, updated_at = now();',
  '',
  "INSERT INTO material_catalog_imports",
  "  (id, status, original_filename, file_size_bytes, file_sha256, blob_object_key, template_key, template_version,",
  "   parsed_snapshot, validation_results, commit_summary, imported_by_actor, committed_at)",
  "VALUES",
  "  ('d0000001-0000-0000-0000-000000000019', 'committed', 'material_property_master_dataset.xlsx',",
  `   ${sourceBytes.length}, '${sourceSha256}',`,
  "   'seed/material_property_master_dataset.xlsx', 'material-master', 'v1', '{}'::jsonb,",
  `   '{"valid":true,"errors":[],"warnings":[]}'::jsonb, '{"materials":${materials.length},"propertyDefinitions":${definitions.length},"propertyFacts":${facts.length}}'::jsonb,`,
  "   'database-seed', now())",
  'ON CONFLICT (file_sha256) DO UPDATE SET',
  "  status = 'committed', commit_summary = EXCLUDED.commit_summary, failure_message = NULL, committed_at = now(), updated_at = now();",
  '',
  'WITH fact_rows(material_code, property_key, source_label, value_numeric, value_text, qualifier, unit, test_method,',
  '  test_condition, temperature_c, load, duration, frequency, direction, specimen, process_type, zone, source_file,',
  '  source_page, source_revision_date, notes, fact_hash) AS (',
  '  VALUES',
  facts.map((row) => {
    const fact = parsedFact(row);
    const hash = crypto.createHash('sha256').update(JSON.stringify(fact)).digest('hex');
    return `    (${sqlString(row.material_id)}, ${sqlString(row.property_id)}, ${sqlString(row.source_label)}, ${sqlNumber(row.value_numeric)}, ${sqlString(row.value_text)}, ${sqlString(row.qualifier)}, ${sqlString(row.unit)}, ${sqlString(row.test_method)}, ${sqlString(row.test_condition)}, ${sqlNumber(row.temperature_c)}, ${sqlString(row.load)}, ${sqlString(row.duration)}, ${sqlString(row.frequency)}, ${sqlString(row.direction)}, ${sqlString(row.specimen)}, ${sqlString(row.process_type)}, ${sqlString(row.zone)}, ${sqlString(row.source_file)}, ${sqlString(row.source_page)}, ${sqlDate(row.source_revision_date)}, ${sqlString(row.notes)}, ${sqlString(hash)})`;
  }).join(',\n'),
  ')',
  'INSERT INTO material_property_facts',
  '  (material_id, property_definition_id, source_label, value_numeric, value_text, qualifier, unit, test_method,',
  '   test_condition, temperature_c, load, duration, frequency, direction, specimen, process_type, zone, source_file,',
  '   source_page, source_revision_date, notes, fact_hash, source_import_id)',
  'SELECT m.id, mpd.id, f.source_label, f.value_numeric, f.value_text, f.qualifier, f.unit, f.test_method,',
  '       f.test_condition, f.temperature_c, f.load, f.duration, f.frequency, f.direction, f.specimen, f.process_type,',
  '       f.zone, f.source_file, f.source_page, f.source_revision_date::date, f.notes, f.fact_hash, mci.id',
  'FROM fact_rows f',
  'JOIN materials m ON m.material_code = f.material_code',
  'JOIN material_property_definitions mpd ON mpd.property_key = f.property_key',
  `JOIN material_catalog_imports mci ON mci.file_sha256 = '${sourceSha256}'`,
  'ON CONFLICT (material_id, fact_hash) DO UPDATE SET',
  '  source_label = EXCLUDED.source_label, value_numeric = EXCLUDED.value_numeric, value_text = EXCLUDED.value_text,',
  '  qualifier = EXCLUDED.qualifier, unit = EXCLUDED.unit, test_method = EXCLUDED.test_method,',
  '  test_condition = EXCLUDED.test_condition, temperature_c = EXCLUDED.temperature_c, load = EXCLUDED.load,',
  '  duration = EXCLUDED.duration, frequency = EXCLUDED.frequency, direction = EXCLUDED.direction,',
  '  specimen = EXCLUDED.specimen, process_type = EXCLUDED.process_type, zone = EXCLUDED.zone,',
  '  source_file = EXCLUDED.source_file, source_page = EXCLUDED.source_page,',
  '  source_revision_date = EXCLUDED.source_revision_date, notes = EXCLUDED.notes;',
  '',
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${outputPath}: ${materials.length} materials, ${definitions.length} definitions, ${facts.length} facts.`);
