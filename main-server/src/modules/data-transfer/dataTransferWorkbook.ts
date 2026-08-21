import * as XLSX from 'xlsx';
import { ValidationError } from '../../errors/app-error';
import type { TransferDefinition, TransferRows, TransferValueType } from './dataTransfer.types';

export const TRANSFER_FINGERPRINT = 'PIS_DATA_TRANSFER_V1';

function serialize(value: unknown, type: TransferValueType | undefined): unknown {
  if (value == null) return '';
  if (type === 'date' && value instanceof Date) return value;
  return value;
}

export function createTransferWorkbook(definition: TransferDefinition, rows: TransferRows): Buffer {
  const workbook = XLSX.utils.book_new();
  const instructions = XLSX.utils.aoa_to_sheet([
    [TRANSFER_FINGERPRINT],
    ['Resource', definition.resource],
    ['Schema Version', 1],
    [],
    ['Keep worksheet names and column headers unchanged. Required columns are marked with *. Exported files use this exact import template.'],
  ]);
  instructions['!cols'] = [{ wch: 22 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');

  for (const sheetDefinition of definition.sheets) {
    const headers = sheetDefinition.columns.map((column) => `${column.header}${column.required ? ' *' : ''}`);
    const values = (rows[sheetDefinition.name] ?? []).map((row) => sheetDefinition.columns.map((column) => serialize(row[column.key], column.type)));
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...values], { cellDates: true });
    sheet['!cols'] = sheetDefinition.columns.map((column) => ({ wch: Math.min(45, Math.max(14, column.header.length + 4)) }));
    sheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(Math.max(0, headers.length - 1))}${Math.max(1, values.length + 1)}` };
    XLSX.utils.book_append_sheet(workbook, sheet, sheetDefinition.name);
  }

  return XLSX.write(workbook, { bookType: 'xlsx', cellDates: true, type: 'buffer' }) as Buffer;
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

export function parseTransferWorkbook(bytes: Buffer, definition: TransferDefinition): TransferRows {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { cellDates: true, type: 'buffer' });
  } catch {
    throw new ValidationError('The uploaded file is not a readable XLSX workbook');
  }
  const instructions = workbook.Sheets['Instructions'];
  if (!instructions || instructions['A1']?.v !== TRANSFER_FINGERPRINT || instructions['B2']?.v !== definition.resource) {
    throw new ValidationError(`Workbook does not match the ${definition.resource} import template`);
  }

  const parsed: TransferRows = {};
  for (const sheetDefinition of definition.sheets) {
    const sheet = workbook.Sheets[sheetDefinition.name];
    if (!sheet) throw new ValidationError(`Missing required worksheet: ${sheetDefinition.name}`);
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: null, header: 1, raw: true });
    const headerRow = matrix[0] ?? [];
    const headerIndexes = new Map(headerRow.map((header, index) => [normalizeHeader(header), index]));
    for (const column of sheetDefinition.columns) {
      if (!headerIndexes.has(column.header.toLowerCase())) throw new ValidationError(`${sheetDefinition.name} is missing column ${column.header}`);
    }
    parsed[sheetDefinition.name] = matrix.slice(1).filter((row) => row.some((value) => value !== null && value !== '')).map((row, rowIndex) => {
      const record: Record<string, unknown> = {};
      for (const column of sheetDefinition.columns) {
        const value = coerce(row[headerIndexes.get(column.header.toLowerCase()) ?? -1], column.type, `${sheetDefinition.name} row ${rowIndex + 2} ${column.header}`);
        if (column.required && (value === null || value === '')) throw new ValidationError(`${sheetDefinition.name} row ${rowIndex + 2} requires ${column.header}`);
        record[column.key] = value;
      }
      return record;
    });
  }
  return parsed;
}
