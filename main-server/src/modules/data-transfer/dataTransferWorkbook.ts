import * as XLSX from 'xlsx';
import { ValidationError } from '../../errors/app-error';
import type { TransferColumn, TransferDefinition, TransferRows, TransferValueType } from './dataTransfer.types';

// ─── Tab name constants & helpers ─────────────────────────────────────────

export const IMPORT_PREFIX = 'import_';
export const TEST_PREFIX = 'test_';
export const INSTRUCTION_PREFIX = 'instruction_';

const EXCEL_TAB_MAX = 31;

/** Converts a human sheet name to a snake_case suffix safe for Excel tab names. */
function toTabSuffix(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function importTabName(sheetName: string): string {
  return `${IMPORT_PREFIX}${toTabSuffix(sheetName)}`.slice(0, EXCEL_TAB_MAX);
}

export function testTabName(sheetName: string): string {
  return `${TEST_PREFIX}${toTabSuffix(sheetName)}`.slice(0, EXCEL_TAB_MAX);
}

export function instructionTabName(sheetName: string): string {
  return `${INSTRUCTION_PREFIX}${toTabSuffix(sheetName)}`.slice(0, EXCEL_TAB_MAX);
}

export interface ParsedRowResult {
  rowIndex: number;
  data: Record<string, unknown>;
  parseErrors: string[];
}

export interface SafeParseResult {
  structuralError?: string;
  sheetRows: Record<string, ParsedRowResult[]>;
}

// ─── Value helpers ─────────────────────────────────────────────────────────

function serialize(value: unknown, type: TransferValueType | undefined): unknown {
  if (value == null) return '';
  if (type === 'date' && value instanceof Date) return value;
  return value;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().replace(/\s*\*$/, '').toLowerCase();
}

function coerce(value: unknown, type: TransferValueType | undefined, location: string): unknown {
  if (value === undefined || value === null || value === '') return null;
  if (type === 'number') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new ValidationError(`${location} must be a number`);
    return parsed;
  }
  if (type === 'boolean') {
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', 'yes', '1'].includes(normalized)) return true;
    if (['false', 'no', '0'].includes(normalized)) return false;
    throw new ValidationError(`${location} must be Yes/No or true/false`);
  }
  if (type === 'date') {
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) throw new ValidationError(`${location} must be a valid date`);
    return parsed.toISOString();
  }
  return String(value).trim();
}

/** Generates a realistic sample value for test_X sheets. */
function sampleValue(column: TransferColumn): unknown {
  if (column.type === 'number') return 1;
  if (column.type === 'boolean') return 'Yes';
  if (column.type === 'date') return '2026-01-15';
  const key = column.key.toLowerCase();
  if (key.includes('code')) return 'EXAMPLE-001';
  if (key.includes('name')) return `Example ${column.header.replace(' *', '')}`;
  if (key === 'status') return 'active';
  if (key.includes('email')) return 'contact@example.com';
  if (key.includes('phone')) return '+1-555-0100';
  if (key.includes('website') || key.includes('url')) return 'https://example.com';
  if (key.includes('notes') || key.includes('description')) return 'Sample description';
  if (key.includes('location')) return 'Bay 1';
  if (key.includes('manufacturer')) return 'Manufacturer Inc.';
  if (key.includes('type')) return 'standard';
  if (key.includes('grade')) return 'Grade A';
  if (key.includes('unit')) return 'mm';
  if (key.includes('version')) return '1';
  if (key.includes('section') || key.endsWith('key')) return `example_${column.key}`;
  if (key.includes('address')) return '123 Main St, Anytown, USA';
  if (key.includes('role')) return 'primary';
  return `example-${column.key}`;
}

/** Generates a human-readable description / validation notes for a field. */
function fieldDescription(column: TransferColumn): string {
  const key = column.key.toLowerCase();
  const type = column.type ?? 'text';
  const notes: string[] = [];

  if (type === 'boolean') notes.push('Accepted values: Yes, No, true, false, 1, 0');
  if (type === 'date') notes.push('Format: YYYY-MM-DD (e.g. 2026-01-15)');
  if (type === 'number') notes.push('Must be a valid number');
  if (key === 'status') notes.push('Accepted values: active, inactive, archived');
  if (key === 'positiontype') notes.push('Accepted values: single, zone, position');
  if (key === 'basistype' || key === 'basis') notes.push('Accepted values: weight_percent');
  if (key.includes('suppliercode')) notes.push('Must match an existing Supplier Code — import Material Suppliers first');
  if (key.includes('machinecode') && !key.includes('name')) notes.push('Must match an existing Machine Code — import Machines first');
  if (key.includes('moldcode') && !key.includes('name')) notes.push('Must match an existing Mold Code — import Molds first');
  if (key.includes('materialcode') && !key.includes('name') && !key.includes('supplier')) notes.push('Must match an existing Material Code — import Materials first');
  if (key.includes('benchmarkcode')) notes.push('Must match an existing Benchmark Code — import Benchmarks first');
  if (key.includes('formulationcode')) notes.push('Must match an existing Formulation Code');
  if (key.includes('metrickey')) notes.push('Must match an existing Metric Key in the system');
  if (key.includes('parameterkey')) notes.push('Unique key for this parameter (e.g. injection_pressure). Use snake_case.');
  if (key.includes('sectionkey')) notes.push('Grouping section (e.g. injection, cooling, mold, barrel)');

  if (column.required) notes.push('REQUIRED');
  if (notes.length === 0) notes.push('Optional');
  return notes.join(' | ');
}

// ─── Sheet builders ────────────────────────────────────────────────────────

function buildDataSheet(columns: TransferColumn[], dataRows: unknown[][]): XLSX.WorkSheet {
  const headers = columns.map((col) => `${col.header}${col.required ? ' *' : ''}`);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows], { cellDates: true });
  sheet['!cols'] = columns.map((col) => ({ wch: Math.min(45, Math.max(14, col.header.length + 4)) }));
  if (headers.length > 0) {
    sheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${Math.max(1, dataRows.length + 1)}` };
  }
  return sheet;
}

function buildTestSheet(columns: TransferColumn[]): XLSX.WorkSheet {
  const sampleRow = columns.map((col) => sampleValue(col));
  return buildDataSheet(columns, [sampleRow]);
}

function buildInstructionSheet(columns: TransferColumn[], sheetDisplayName: string): XLSX.WorkSheet {
  const title = [[`Field Reference — ${sheetDisplayName}`], [], ['Field Name', 'Data Type', 'Required', 'Example Value', 'Description / Validation Notes']];
  const rows = columns.map((col) => [
    col.header,
    col.type ?? 'text',
    col.required ? 'Yes' : 'No',
    String(sampleValue(col)),
    fieldDescription(col),
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([...title, ...rows]);
  sheet['!cols'] = [{ wch: 26 }, { wch: 12 }, { wch: 10 }, { wch: 26 }, { wch: 70 }];
  // Bold the title row
  if (sheet['A1']) sheet['A1'].s = { font: { bold: true, sz: 13 } };
  // Bold the header row (row 3)
  const headerCols = ['A', 'B', 'C', 'D', 'E'];
  headerCols.forEach((col) => {
    const cell = sheet[`${col}3`];
    if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9E1F2' } } };
  });
  return sheet;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Creates a workbook with the following tab structure for EACH sheet in the definition:
 *   • `import_{name}` — data sheet (processed during import; empty for templates, populated for exports)
 *   • `test_{name}`   — one sample row showing how to fill the template
 *   • `instruction_{name}` — field reference with types, requirements, and validation notes
 */
export function createTransferWorkbook(definition: TransferDefinition, rows: TransferRows): Buffer {
  const workbook = XLSX.utils.book_new();

  for (const sheetDef of definition.sheets) {
    // import_{name} — the data tab
    const dataRows = (rows[sheetDef.name] ?? []).map((row) =>
      sheetDef.columns.map((col) => serialize(row[col.key], col.type))
    );
    XLSX.utils.book_append_sheet(workbook, buildDataSheet(sheetDef.columns, dataRows), importTabName(sheetDef.name));

    // test_{name} — one sample row
    XLSX.utils.book_append_sheet(workbook, buildTestSheet(sheetDef.columns), testTabName(sheetDef.name));

    // instruction_{name} — field reference
    XLSX.utils.book_append_sheet(workbook, buildInstructionSheet(sheetDef.columns, sheetDef.name), instructionTabName(sheetDef.name));
  }

  return XLSX.write(workbook, { bookType: 'xlsx', cellDates: true, type: 'buffer' }) as Buffer;
}

/**
 * Parses a transfer workbook, throwing on any structural error.
 * Only `import_X` tabs are processed; `test_X` and `instruction_X` tabs are ignored.
 */
export function parseTransferWorkbook(bytes: Buffer, definition: TransferDefinition): TransferRows {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { cellDates: true, type: 'buffer' });
  } catch {
    throw new ValidationError('The uploaded file is not a readable XLSX workbook');
  }

  const firstImportTab = importTabName(definition.sheets[0]?.name ?? 'data');
  if (!workbook.Sheets[firstImportTab]) {
    throw new ValidationError(`Workbook does not match the ${definition.resource} import template — missing "${firstImportTab}" worksheet`);
  }

  return parseSheets(workbook, definition, /* throwOnError */ true) as TransferRows;
}

/**
 * Parses the workbook without throwing — collects per-row errors.
 * Returns a structural error string if the file itself is unreadable or missing required import_ tabs.
 */
export function parseTransferWorkbookSafe(bytes: Buffer, definition: TransferDefinition): SafeParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { cellDates: true, type: 'buffer' });
  } catch {
    return { structuralError: 'The uploaded file is not a readable XLSX workbook', sheetRows: {} };
  }

  const firstImportTab = importTabName(definition.sheets[0]?.name ?? 'data');
  if (!workbook.Sheets[firstImportTab]) {
    return {
      structuralError: `Workbook does not match the ${definition.resource} import template — missing "${firstImportTab}" worksheet`,
      sheetRows: {},
    };
  }

  const sheetRows: Record<string, ParsedRowResult[]> = {};

  for (const sheetDef of definition.sheets) {
    const tabName = importTabName(sheetDef.name);
    const sheet = workbook.Sheets[tabName];
    if (!sheet) {
      return { structuralError: `Missing required worksheet: ${tabName}`, sheetRows: {} };
    }

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: null, header: 1, raw: true });
    const headerRow = matrix[0] ?? [];
    const headerIndexes = new Map(headerRow.map((h, i) => [normalizeHeader(h), i]));

    for (const column of sheetDef.columns) {
      if (!headerIndexes.has(column.header.toLowerCase())) {
        return { structuralError: `${tabName} is missing column "${column.header}"`, sheetRows: {} };
      }
    }

    const results: ParsedRowResult[] = [];
    const dataRows = matrix.slice(1).filter((row) => row.some((v) => v !== null && v !== ''));

    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
      const row = dataRows[rowIndex]!;
      const record: Record<string, unknown> = {};
      const parseErrors: string[] = [];

      for (const column of sheetDef.columns) {
        let value: unknown;
        try {
          value = coerce(row[headerIndexes.get(column.header.toLowerCase()) ?? -1], column.type, column.header);
        } catch (err) {
          parseErrors.push(err instanceof Error ? err.message : `Invalid value in ${column.header}`);
          value = null;
        }
        if (column.required && (value === null || value === '')) {
          parseErrors.push(`${column.header} is required`);
        }
        record[column.key] = value;
      }
      results.push({ rowIndex, data: record, parseErrors });
    }
    sheetRows[sheetDef.name] = results;
  }

  return { sheetRows };
}

// ─── Internal ──────────────────────────────────────────────────────────────

function parseSheets(workbook: XLSX.WorkBook, definition: TransferDefinition, _throwOnError: boolean): TransferRows {
  const parsed: TransferRows = {};

  for (const sheetDef of definition.sheets) {
    const tabName = importTabName(sheetDef.name);
    const sheet = workbook.Sheets[tabName];
    if (!sheet) throw new ValidationError(`Missing required worksheet: ${tabName}`);

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: null, header: 1, raw: true });
    const headerRow = matrix[0] ?? [];
    const headerIndexes = new Map(headerRow.map((h, i) => [normalizeHeader(h), i]));

    for (const column of sheetDef.columns) {
      if (!headerIndexes.has(column.header.toLowerCase())) {
        throw new ValidationError(`${tabName} is missing column "${column.header}"`);
      }
    }

    parsed[sheetDef.name] = matrix
      .slice(1)
      .filter((row) => row.some((v) => v !== null && v !== ''))
      .map((row, rowIndex) => {
        const record: Record<string, unknown> = {};
        for (const column of sheetDef.columns) {
          const value = coerce(row[headerIndexes.get(column.header.toLowerCase()) ?? -1], column.type, `${tabName} row ${rowIndex + 2} ${column.header}`);
          if (column.required && (value === null || value === '')) {
            throw new ValidationError(`${tabName} row ${rowIndex + 2} requires "${column.header}"`);
          }
          record[column.key] = value;
        }
        return record;
      });
  }

  return parsed;
}
