import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { SetupWorkbookParser } from '../setupWorkbook.parser';

const TITLES: Record<string, string> = {
  'Setup Sheet': 'BOY 125E  INJECTION MOLDING MACHINE — SETUP SHEET',
  'Hot Runner Zones': 'BOY 125E — HOT RUNNER ZONE TEMPERATURE SETTINGS',
  'Revision Log': 'SETUP SHEET — REVISION LOG',
  'Material Reference': 'MATERIAL PROCESSING REFERENCE',
};

function workbookBuffer(populate = false, mutate?: (workbook: XLSX.WorkBook) => void): Buffer {
  const workbook = XLSX.utils.book_new();
  for (const [name, title] of Object.entries(TITLES)) {
    const sheet = XLSX.utils.aoa_to_sheet([[title]]);
    sheet['!ref'] = name === 'Setup Sheet' ? 'A1:H80'
      : name === 'Hot Runner Zones' ? 'A1:L40'
        : name === 'Revision Log' ? 'A1:F22' : 'A1:I32';
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  const baseHotRunner = workbook.Sheets['Hot Runner Zones']!;
  baseHotRunner['E3'] = { t: 'n', v: 18 };
  for (let index = 0; index < 18; index += 1) baseHotRunner[`A${index + 7}`] = { t: 'n', v: index + 1 };
  if (populate) {
    const setup = workbook.Sheets['Setup Sheet']!;
    const hotRunner = workbook.Sheets['Hot Runner Zones']!;
    const revisionLog = workbook.Sheets['Revision Log']!;
    setup['B3'] = { t: 's', v: 'ABS' };
    setup['B4'] = { t: 's', v: 'MOLD-1' };
    setup['B5'] = { t: 's', v: 'BOY-125E' };
    setup['D5'] = { t: 's', v: '2026-07-17' };
    setup['F5'] = { t: 's', v: 'Operator One' };
    setup['B6'] = { t: 's', v: '2' };
    setup['D6'] = { t: 's', v: 'Approver One' };
    setup['A10'] = { t: 'n', v: 1 };
    setup['B10'] = { t: 's', v: 'Feed' };
    setup['C10'] = { t: 'n', v: 410 };
    setup['D10'] = { t: 'n', v: 407 };
    setup['E10'] = { t: 's', v: '±10' };
    hotRunner['E3'] = { t: 'n', v: 18 };
    hotRunner['A7'] = { t: 'n', v: 1 };
    hotRunner['B7'] = { t: 's', v: 'Nozzle' };
    hotRunner['C7'] = { t: 'n', v: 420 };
    hotRunner['D7'] = { t: 'n', v: 419 };
    hotRunner['G7'] = { t: 's', v: 'OK' };
    revisionLog['A3'] = { t: 's', v: '2' };
    revisionLog['D3'] = { t: 's', v: 'Approver One' };
  }
  mutate?.(workbook);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('SetupWorkbookParser', () => {
  const parser = new SetupWorkbookParser();

  it('returns approval and data errors for the blank four-sheet template', () => {
    const result = parser.parse(workbookBuffer());
    expect(result.snapshot.templateKey).toBe('boy-125e');
    expect(result.validation.errors).toContain('Production date is required');
    expect(result.validation.errors).toContain('Approved By is required');
    expect(result.validation.warnings).toContain('Workbook contains no actual process readings; imported run will default to planned');
  });

  it('maps a completed workbook without blocking validation errors', () => {
    const result = parser.parse(workbookBuffer(true));
    expect(result.validation.errors).toEqual([]);
    expect(result.snapshot.hasActualReadings).toBe(true);
    expect(result.snapshot.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'barrel.temperature', setpoint: 410, actual: 407 }),
      expect.objectContaining({ key: 'hot_runner.temperature', positionIndex: 1, actual: 419 }),
    ]));
  });

  it('rejects missing, extra, externally-linked, and malformed workbooks', () => {
    expect(() => parser.parse(workbookBuffer(false, (workbook) => {
      workbook.SheetNames = workbook.SheetNames.filter((name) => name !== 'Revision Log');
      delete workbook.Sheets['Revision Log'];
    }))).toThrow(/Missing required sheets/);
    expect(() => parser.parse(workbookBuffer(false, (workbook) => {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['extra']]), 'Extra');
    }))).toThrow(/Unsupported sheets/);
    expect(() => parser.parse(workbookBuffer(false, (workbook) => {
      workbook.Sheets['Setup Sheet']!['B2'] = { t: 's', v: 'link', l: { Target: 'https://example.com/source.xlsx' } };
    }))).toThrow(/External workbook links/);
    expect(() => parser.parse(Buffer.from('not a workbook'))).toThrow(/not a readable XLSX/);
  });

  it('detects duplicate zones, invalid status, invalid numbers, and unknown units', () => {
    const result = parser.parse(workbookBuffer(true, (workbook) => {
      const setup = workbook.Sheets['Setup Sheet']!;
      const hotRunner = workbook.Sheets['Hot Runner Zones']!;
      setup['C25'] = { t: 's', v: 'not-a-number' };
      setup['D25'] = { t: 'n', v: 5 };
      setup['E25'] = { t: 's', v: 'mystery-unit' };
      setup['B26'] = { t: 's', v: 'Stage 1' };
      setup['C26'] = { t: 'n', v: 10 };
      hotRunner['A8'] = { t: 'n', v: 1 };
      hotRunner['C8'] = { t: 'n', v: 421 };
      hotRunner['G7'] = { t: 's', v: 'BAD' };
    }));
    expect(result.validation.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Invalid numeric value at Setup Sheet!C25'),
      expect.stringContaining('Unknown unit for injection.speed'),
      'Duplicate hot-runner zone numbers were found',
      'Duplicate stage numbers were found for injection.speed',
      expect.stringContaining('Invalid hot-runner status'),
    ]));
  });

  it('ignores cached formula errors in optional computed cells', () => {
    const result = parser.parse(workbookBuffer(true, (workbook) => {
      workbook.Sheets['Material Reference']!['H23'] = { t: 'e', v: 7, w: '#DIV/0!', f: '1/0' };
    }));
    expect(result.validation.errors.some((error) => error.includes('H23'))).toBe(false);
  });
});
