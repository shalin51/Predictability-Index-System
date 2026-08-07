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
    sheet['!ref'] = name === 'Setup Sheet' ? 'A1:J87'
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
    setup['A23'] = { t: 's', v: 'INJECTION PARAMETERS' };
    setup['A25'] = { t: 's', v: 'Injection Speed' };
    setup['B25'] = { t: 's', v: 'Stage 0' };
    setup['E25'] = { t: 's', v: 'mm/s' };
    setup['A48'] = { t: 's', v: 'HOLD / PACK PARAMETERS' };
    setup['A49'] = { t: 's', v: 'Stage' };
    setup['B49'] = { t: 's', v: 'Hold Pressure (psi)' };
    setup['C49'] = { t: 's', v: 'Hold Time (sec)' };
    setup['D49'] = { t: 's', v: 'Actual Pressure (bar)' };
    setup['A53'] = { t: 's', v: 'SCREW & RECOVERY SETTINGS' };
    setup['A62'] = { t: 's', v: 'COOLING & CYCLE TIME' };
    setup['A72'] = { t: 's', v: 'CLAMP SETTINGS' };
    setup['A83'] = { t: 's', v: 'OPERATOR NOTES & OBSERVATIONS' };
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

  it('allows a partial workbook and reports missing metadata as warnings', () => {
    const result = parser.parse(workbookBuffer());
    expect(result.snapshot.templateKey).toBe('boy-125e');
    expect(result.validation.errors).toEqual([]);
    expect(result.validation.warnings).toContain('Production date is blank; the import date will be used');
    expect(result.validation.warnings).toContain('Approved By is blank; the imported setup will remain a draft');
    expect(result.validation.warnings).toContain('Workbook contains no actual process readings; imported run will default to planned');
  });

  it('maps a completed workbook without blocking validation errors', () => {
    const result = parser.parse(workbookBuffer(true));
    expect(result.validation.errors).toEqual([]);
    expect(result.snapshot.hasActualReadings).toBe(true);
    expect(result.snapshot.hotRunner.zones).toHaveLength(18);
    expect(result.snapshot.hotRunner.zones?.[0]).toEqual({ zoneNumber: 1, zoneName: 'Nozzle' });
    expect(result.snapshot.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'barrel.temperature', setpoint: 410, actual: 407 }),
      expect.objectContaining({ key: 'hot_runner.temperature', positionIndex: 1, actual: 419 }),
    ]));
  });

  it('maps every revised BOY 125E parameter block by its row labels', () => {
    const result = parser.parse(workbookBuffer(true, (workbook) => {
      const setup = workbook.Sheets['Setup Sheet']!;
      const cells: Record<string, XLSX.CellObject> = {
        A33: { t: 's', v: 'Injection Speed' }, B33: { t: 's', v: 'Stage 8' }, C33: { t: 'n', v: 63 }, E33: { t: 's', v: 'mm/s' },
        A34: { t: 's', v: 'Injection Pressure' }, B34: { t: 's', v: 'Stage 0' }, C34: { t: 'n', v: 1200 }, E34: { t: 's', v: 'psi' },
        A42: { t: 's', v: 'Injection Pressure' }, B42: { t: 's', v: 'Stage 8' }, C42: { t: 'n', v: 1200 }, E42: { t: 's', v: 'psi' },
        A43: { t: 's', v: 'V/P Transfer Position' }, C43: { t: 'n', v: 8 }, E43: { t: 's', v: 'mm' },
        A50: { t: 's', v: 'Hold Stage 1' }, B50: { t: 'n', v: 1200 }, C50: { t: 'n', v: 0.01 }, D50: { t: 'n', v: 10 },
        A55: { t: 's', v: 'Screw Speed' }, B55: { t: 'n', v: 80 }, D55: { t: 's', v: 'RPM' },
        A56: { t: 's', v: 'Back Pressure' }, B56: { t: 'n', v: 1200 }, D56: { t: 's', v: 'psi' },
        A64: { t: 's', v: 'Cooling Time' }, B64: { t: 'n', v: 12 }, D64: { t: 's', v: 'sec' },
        A74: { t: 's', v: 'Clamp Force' }, B74: { t: 'n', v: 1256 }, D74: { t: 's', v: 'kN' },
        A75: { t: 's', v: 'Mold Close Speed' }, B75: { t: 'n', v: 345 }, D75: { t: 's', v: 'mm/s' },
        A77: { t: 's', v: 'Mold Open Speed ' }, B77: { t: 'n', v: 350 }, D77: { t: 's', v: 'mm/s' },
        A84: { t: 's', v: 'Startup Notes:' }, B84: { t: 's', v: 'Revised startup sequence' },
      };
      Object.assign(setup, cells);
    }));

    expect(result.snapshot.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'injection.speed', positionIndex: 8, setpoint: 63 }),
      expect.objectContaining({ key: 'injection.pressure', positionIndex: 0, setpoint: 1200, unit: 'psi' }),
      expect.objectContaining({ key: 'injection.pressure', positionIndex: 8, setpoint: 1200, unit: 'psi' }),
      expect.objectContaining({ key: 'injection.vp_transfer_position', setpoint: 8 }),
      expect.objectContaining({ key: 'hold.pressure', positionIndex: 1, setpoint: 1200, unit: 'psi' }),
      expect.objectContaining({ key: 'screw.back_pressure', setpoint: 1200, unit: 'psi' }),
      expect.objectContaining({ key: 'cycle.cooling_time', setpoint: 12 }),
      expect.objectContaining({ key: 'clamp.mold_close_speed', setpoint: 345 }),
      expect.objectContaining({ key: 'clamp.mold_open_speed', setpoint: 350 }),
    ]));
    expect(result.snapshot.notes).toContainEqual({ type: 'startup', text: 'Revised startup sequence' });
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
      setup['A26'] = { t: 's', v: 'Injection Speed' };
      setup['B26'] = { t: 's', v: 'Stage 0' };
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
