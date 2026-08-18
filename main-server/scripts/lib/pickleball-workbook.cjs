const path = require('node:path');

const METRIC_MAPPINGS = [
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
    unit: 'in',
    methodCode: 'PICKLEBALL_DROP_TEST_LEGACY',
    methodName: 'Pickleball Drop Test — Legacy Workbook',
    sortOrder: 84,
  },
];

function normalizeLabel(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeKey(value) {
  return normalizeLabel(value).toLowerCase();
}

function numericValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = normalizeLabel(value).match(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)/);
  return match ? Number(match[0]) : null;
}

function percentageIngredient(value, role, address) {
  const sourceValue = normalizeLabel(value);
  if (!sourceValue) return null;
  const percentage = sourceValue.match(/(?:^|\s)(\d*\.?\d+)\s*%/i);
  if (!percentage) throw new Error(`Missing percentage for ${role} at ${address}: ${sourceValue}`);
  const percentComposition = Number(percentage[1]);
  const materialLabel = normalizeLabel(sourceValue.replace(percentage[0], ' ').replace(/^[-–—]+|[-–—]+$/g, ''));
  if (!materialLabel) throw new Error(`Missing material name for ${role} at ${address}: ${sourceValue}`);
  if (!(percentComposition >= 0 && percentComposition <= 100)) {
    throw new Error(`Invalid percentage for ${role} at ${address}: ${sourceValue}`);
  }
  return { role, sourceValue, sourceCell: address, materialLabel, percentComposition };
}

function findRowByLabel(sheet, range, matcher, XLSX) {
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const address = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (matcher(normalizeKey(sheet[address]?.v))) return row;
  }
  return undefined;
}

function parseSheet(sheetName, sheet, XLSX) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const sampleColumns = [];
  for (let column = 1; column <= range.e.c; column += 1) {
    const address = XLSX.utils.encode_cell({ r: 0, c: column });
    const label = normalizeLabel(sheet[address]?.v);
    if (/^sample \d+$/i.test(label)) sampleColumns.push({ column, label });
  }

  const baseRow = findRowByLabel(sheet, range, (value) => value === 'base material', XLSX);
  const colorRow = findRowByLabel(sheet, range, (value) => value === 'color', XLSX);
  const additiveRow = findRowByLabel(sheet, range, (value) => /^add[ai]tive$/.test(value), XLSX);
  const baseAddress = baseRow === undefined ? null : XLSX.utils.encode_cell({ r: baseRow, c: 1 });
  const colorAddress = colorRow === undefined ? null : XLSX.utils.encode_cell({ r: colorRow, c: 1 });
  const additiveAddress = additiveRow === undefined ? null : XLSX.utils.encode_cell({ r: additiveRow, c: 1 });
  const baseMaterial = baseAddress ? normalizeLabel(sheet[baseAddress]?.v) : '';
  const color = colorAddress ? percentageIngredient(sheet[colorAddress]?.v, 'color', colorAddress) : null;
  const additive = additiveAddress ? percentageIngredient(sheet[additiveAddress]?.v, 'additive', additiveAddress) : null;

  const results = [];
  const warnings = [];
  for (const mapping of METRIC_MAPPINGS) {
    const metricRow = findRowByLabel(sheet, range, (value) => value === normalizeKey(mapping.sourceLabel), XLSX);
    if (metricRow === undefined) {
      if (sampleColumns.length) warnings.push(`${sheetName}: missing metric row '${mapping.sourceLabel}'`);
      continue;
    }
    for (const sample of sampleColumns) {
      const address = XLSX.utils.encode_cell({ r: metricRow, c: sample.column });
      const rawValue = sheet[address]?.v;
      if (rawValue === undefined || rawValue === null || rawValue === '') continue;
      const value = numericValue(rawValue);
      if (value === null) {
        warnings.push(`${sheetName}!${address}: nonnumeric result '${normalizeLabel(rawValue)}' was not imported`);
        continue;
      }
      results.push({ ...mapping, sampleLabel: sample.label, sourceCell: address, value });
    }
  }

  if (!baseMaterial) {
    const reason = results.length ? 'missing formulation metadata' : 'blank sheet';
    return { sheetName: normalizeLabel(sheetName), reason, sampleColumns, results, warnings };
  }
  if (!color) throw new Error(`${sheetName}: base material exists but color percentage is missing`);

  const additivePercent = additive?.percentComposition ?? 0;
  const basePercent = 100 - color.percentComposition - additivePercent;
  if (!(basePercent > 0 && basePercent <= 100)) {
    throw new Error(`${sheetName}: component percentages leave an invalid base percentage (${basePercent})`);
  }

  const components = [
    {
      role: 'base',
      sourceValue: baseMaterial,
      sourceCell: baseAddress,
      materialLabel: baseMaterial,
      percentComposition: basePercent,
    },
    color,
    ...(additive ? [additive] : []),
  ];
  const explicitSheetPercent = normalizeLabel(sheetName).match(/(\d*\.?\d+)\s*%/);
  if (explicitSheetPercent && additive && Number(explicitSheetPercent[1]) !== additive.percentComposition) {
    warnings.push(
      `${sheetName}: sheet name says ${explicitSheetPercent[1]}% but additive cell says ${additive.percentComposition}%; the additive cell is authoritative`
    );
  }
  return {
    sheetName: normalizeLabel(sheetName),
    sampleColumns,
    components,
    results,
    warnings,
  };
}

function parseWorkbook(workbookPath, XLSX) {
  const workbook = XLSX.readFile(workbookPath, { cellFormula: true });
  const parsed = workbook.SheetNames.map((sheetName) => parseSheet(sheetName, workbook.Sheets[sheetName], XLSX));
  const formulations = parsed.filter((sheet) => sheet.components);
  const skipped = parsed
    .filter((sheet) => !sheet.components)
    .map((sheet) => ({ sheetName: sheet.sheetName, reason: sheet.reason, resultCount: sheet.results.length }));
  return {
    workbookPath,
    workbookName: path.basename(workbookPath),
    formulations,
    skipped,
    warnings: parsed.flatMap((sheet) => sheet.warnings),
    totals: {
      sheets: parsed.length,
      formulations: formulations.length,
      samples: formulations.reduce((sum, sheet) => sum + sheet.sampleColumns.length, 0),
      results: formulations.reduce((sum, sheet) => sum + sheet.results.length, 0),
    },
  };
}

module.exports = {
  METRIC_MAPPINGS,
  normalizeKey,
  normalizeLabel,
  numericValue,
  parseWorkbook,
  percentageIngredient,
};
