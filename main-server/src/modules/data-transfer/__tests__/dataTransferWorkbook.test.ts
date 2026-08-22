import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { transferDefinitions } from '../dataTransfer.config';
import { createTransferWorkbook, parseTransferWorkbook, importTabName, testTabName, instructionTabName } from '../dataTransferWorkbook';

describe('data transfer workbook contract', () => {
  it.each(Object.values(transferDefinitions).map((definition) => [definition.resource, definition] as const))(
    'round trips the %s required import template',
    (_resource, definition) => {
      const firstSheet = definition.sheets[0];
      expect(firstSheet).toBeDefined();
      const sample = Object.fromEntries(firstSheet!.columns.map((column) => {
        if (column.type === 'number') return [column.key, 1];
        if (column.type === 'boolean') return [column.key, true];
        if (column.type === 'date') return [column.key, '2026-08-19T00:00:00.000Z'];
        return [column.key, column.defaultValue ?? column.allowedValues?.[0] ?? `${column.key}-value`];
      }));
      const bytes = createTransferWorkbook(definition, { [firstSheet!.name]: [sample] });
      const parsed = parseTransferWorkbook(bytes, definition);
      expect(parsed[firstSheet!.name]).toHaveLength(1);
      expect(parsed[firstSheet!.name]?.[0]).toMatchObject(sample);
    }
  );

  it('every sheet gets import_, test_, and instruction_ tabs', () => {
    for (const definition of Object.values(transferDefinitions)) {
      const bytes = createTransferWorkbook(definition, {});
      const wb = XLSX.read(bytes, { type: 'buffer' });
      for (const sheet of definition.sheets) {
        expect(wb.SheetNames).toContain(importTabName(sheet.name));
        expect(wb.SheetNames).toContain(testTabName(sheet.name));
        expect(wb.SheetNames).toContain(instructionTabName(sheet.name));
      }
    }
  });

  it('test_{name} sheet has exactly one data row per sheet', () => {
    for (const definition of Object.values(transferDefinitions)) {
      const bytes = createTransferWorkbook(definition, {});
      const wb = XLSX.read(bytes, { type: 'buffer' });
      for (const sheet of definition.sheets) {
        const testSheet = wb.Sheets[testTabName(sheet.name)];
        expect(testSheet).toBeDefined();
        const rows = XLSX.utils.sheet_to_json(testSheet!, { defval: null });
        expect(rows).toHaveLength(1);
      }
    }
  });

  it('import_{name} is empty (no data rows) in the template', () => {
    const bytes = createTransferWorkbook(transferDefinitions['machines']!, {});
    const wb = XLSX.read(bytes, { type: 'buffer' });
    const importSheet = wb.Sheets[importTabName('Machines')];
    expect(importSheet).toBeDefined();
    const rows = XLSX.utils.sheet_to_json(importSheet!, { defval: null });
    expect(rows).toHaveLength(0);
  });

  it('instruction_{name} sheet has one row per column', () => {
    const bytes = createTransferWorkbook(transferDefinitions['machines']!, {});
    const wb = XLSX.read(bytes, { type: 'buffer' });
    const instrSheet = wb.Sheets[instructionTabName('Machines')];
    expect(instrSheet).toBeDefined();
    // Row 1 = title, row 2 = blank spacer, row 3 = headers, row 4+ = field rows
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(instrSheet!, { header: 1, defval: null });
    const fieldRows = matrix.slice(3); // skip title + spacer + header
    expect(fieldRows.length).toBe(transferDefinitions['machines']!.sheets[0]!.columns.length);
  });

  it('lists and enforces each field-specific allowed value set', () => {
    const definition = transferDefinitions['formulations']!;
    const bytes = createTransferWorkbook(definition, {});
    const wb = XLSX.read(bytes, { type: 'buffer' });
    const instructions = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[instructionTabName('Formulations')]!, { header: 1, defval: null });
    expect(instructions.flat().join(' ')).toContain('draft, approved, molded, testing, scored, archived');

    const invalid = createTransferWorkbook(definition, {
      Formulations: [{ formulationCode: 'F-001', versionNo: 1, status: 'active', notes: '' }],
      Components: [],
    });
    expect(() => parseTransferWorkbook(invalid, definition)).toThrow(/Status must be one of: draft/);
  });

  it('rejects a workbook missing the first import_ tab', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Col']]), 'wrong_sheet');
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    expect(() => parseTransferWorkbook(bytes, transferDefinitions['machines']!)).toThrow(/import_machines/);
  });

  it('production-runs has import_ and test_ tabs for both sheets', () => {
    const bytes = createTransferWorkbook(transferDefinitions['production-runs']!, {});
    const wb = XLSX.read(bytes, { type: 'buffer' });
    expect(wb.SheetNames).toContain(importTabName('Production Runs'));
    expect(wb.SheetNames).toContain(testTabName('Production Runs'));
    expect(wb.SheetNames).toContain(importTabName('Samples'));
    expect(wb.SheetNames).toContain(testTabName('Samples'));
  });

  it('import_{name} headers match definition columns', () => {
    for (const definition of Object.values(transferDefinitions)) {
      const bytes = createTransferWorkbook(definition, {});
      const wb = XLSX.read(bytes, { type: 'buffer' });
      for (const sheetDef of definition.sheets) {
        const sheet = wb.Sheets[importTabName(sheetDef.name)]!;
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
        const headers = (matrix[0] ?? []) as string[];
        const normalised = headers.map((h) => h.replace(/\s*\*$/, '').trim());
        for (const col of sheetDef.columns) {
          expect(normalised).toContain(col.header);
        }
      }
    }
  });
});
