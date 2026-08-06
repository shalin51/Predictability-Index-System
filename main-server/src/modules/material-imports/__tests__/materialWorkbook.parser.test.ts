import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { MaterialWorkbookParser } from '../materialWorkbook.parser';

function workbookBuffer(mutate?: (workbook: XLSX.WorkBook) => void): Buffer {
  const workbook = XLSX.utils.book_new();
  const register = XLSX.utils.aoa_to_sheet([
    ['Material Register'],
    [],
    [],
    ['material_id', 'manufacturer', 'product_grade', 'chemistry', 'role_in_blend', 'source_file', 'source_revision_date', 'notes'],
    ['MAT-001', 'Supplier One', 'Grade One', 'Polymer', 'Base resin', 'grade-one.pdf', '2026-01-01', 'Test material'],
  ]);
  const dictionary = XLSX.utils.aoa_to_sheet([
    ['Property Dictionary - 85 canonical properties'],
    [],
    [],
    ['property_id', 'category', 'canonical_property', 'source_labels_synonyms', 'condition_dimensions', 'common_units', 'value_type', 'materials_covered', 'origin', 'implementation_notes'],
    ['P001', 'Physical', 'Density / Specific Gravity', 'Density', 'Temperature', 'g/cm3', 'Numeric', 1, 'Test', 'Keep conditions'],
  ]);
  const facts = XLSX.utils.aoa_to_sheet([
    ['Property Facts - the dataset'],
    [],
    [],
    ['material_id', 'manufacturer', 'product_grade', 'property_id', 'property_name', 'source_label', 'value_numeric', 'value_text', 'qualifier', 'unit', 'test_method', 'test_condition', 'temperature_c', 'load', 'duration', 'frequency', 'direction', 'specimen', 'process_type', 'zone', 'source_file', 'source_page', 'source_revision_date', 'notes'],
    ['MAT-001', 'Supplier One', 'Grade One', 'P001', 'Density / Specific Gravity', 'Density', 0.9, null, null, 'g/cm3', 'ASTM D792', '23 C', 23, null, null, null, null, null, null, null, 'grade-one.pdf', null, '2026-01-01', null],
  ]);
  XLSX.utils.book_append_sheet(workbook, register, 'Material Register');
  XLSX.utils.book_append_sheet(workbook, dictionary, 'Property Dictionary');
  XLSX.utils.book_append_sheet(workbook, facts, 'Property Facts');
  mutate?.(workbook);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function singleSheetWorkbookBuffer(mutate?: (workbook: XLSX.WorkBook) => void): Buffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Material Import - Single Sheet v1'],
    [],
    [],
    ['material_id', 'manufacturer', 'product_grade', 'chemistry', 'role_in_blend', 'source_file', 'source_revision_date', 'material_notes', 'property_id', 'category', 'property_name', 'source_labels_synonyms', 'condition_dimensions', 'common_units', 'value_type', 'origin', 'implementation_notes', 'source_label', 'value_numeric', 'value_text', 'qualifier', 'unit', 'test_method', 'test_condition', 'temperature_c', 'load', 'duration', 'frequency', 'direction', 'specimen', 'process_type', 'zone', 'source_page', 'fact_notes'],
    ['MAT-001', 'Supplier One', 'Grade One', 'Polymer', 'Base resin', 'grade-one.pdf', '2026-01-01', 'Test material', 'P001', 'Physical', 'Density / Specific Gravity', 'Density', 'Temperature', 'g/cm3', 'Numeric', 'Test', 'Keep conditions', 'Density', 0.9, null, null, 'g/cm3', 'ASTM D792', '23 C', 23, null, null, null, null, null, null, null, '2', null],
    ['MAT-001', 'Supplier One', 'Grade One', 'Polymer', 'Base resin', 'grade-one.pdf', '2026-01-01', 'Test material', 'P002', 'Rheological', 'Melt Flow Rate', 'MFR', 'Temperature; Load', 'g/10 min', 'Numeric', 'Test', null, 'Melt Flow Rate', 12, null, null, 'g/10 min', 'ASTM D1238', '230 C / 2.16 kg', 230, '2.16 kg', null, null, null, null, null, null, '3', null],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Materials Import');
  mutate?.(workbook);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('MaterialWorkbookParser', () => {
  const parser = new MaterialWorkbookParser();

  it('parses the fixed material master template', () => {
    const result = parser.parse(workbookBuffer());
    expect(result.validation.errors).toEqual([]);
    expect(result.snapshot.materials).toHaveLength(1);
    expect(result.snapshot.propertyDefinitions).toHaveLength(1);
    expect(result.snapshot.propertyFacts[0]).toMatchObject({ materialExternalId: 'MAT-001', propertyKey: 'P001', valueNumeric: 0.9 });
  });

  it('parses the single-sheet material import template', () => {
    const result = parser.parse(singleSheetWorkbookBuffer());
    expect(result.validation.errors).toEqual([]);
    expect(result.snapshot.materials).toHaveLength(1);
    expect(result.snapshot.propertyDefinitions).toHaveLength(2);
    expect(result.snapshot.propertyFacts).toHaveLength(2);
    expect(result.snapshot.propertyFacts[1]).toMatchObject({ materialExternalId: 'MAT-001', propertyKey: 'P002', valueNumeric: 12 });
  });

  it('rejects inconsistent repeated material details in the single-sheet template', () => {
    const result = parser.parse(singleSheetWorkbookBuffer((workbook) => {
      workbook.Sheets['Materials Import']!['D6'] = { t: 's', v: 'Different chemistry' };
    }));
    expect(result.validation.errors).toContain('Inconsistent material details for MAT-001');
  });

  it('rejects missing template sheets and mismatched references', () => {
    expect(() => parser.parse(workbookBuffer((workbook) => {
      workbook.SheetNames = workbook.SheetNames.filter((name) => name !== 'Property Dictionary');
      delete workbook.Sheets['Property Dictionary'];
    }))).toThrow(/Missing required sheets/);

    const result = parser.parse(workbookBuffer((workbook) => {
      workbook.Sheets['Property Facts']!['A5'] = { t: 's', v: 'MAT-999' };
    }));
    expect(result.validation.errors).toContain('Unknown material_id in Property Facts: MAT-999');
  });

  it('rejects duplicate facts and accepts qualified numeric values with preserved text', () => {
    const result = parser.parse(workbookBuffer((workbook) => {
      const sheet = workbook.Sheets['Property Facts']!;
      sheet['G5'] = { t: 'n', v: 0.9 };
      sheet['H5'] = { t: 's', v: '> 0.9' };
      sheet['I5'] = { t: 's', v: '>' };
      XLSX.utils.sheet_add_aoa(sheet, [[
        'MAT-001', 'Supplier One', 'Grade One', 'P001', 'Density / Specific Gravity', 'Density', 0.9, '> 0.9', '>', 'g/cm3', 'ASTM D792', '23 C', 23, null, null, null, null, null, null, null, 'grade-one.pdf', null, '2026-01-01', null,
      ]], { origin: 'A6' });
    }));
    expect(result.snapshot.propertyFacts[0]).toMatchObject({ valueNumeric: 0.9, valueText: '> 0.9', qualifier: '>' });
    expect(result.validation.errors.some((error) => error.includes('Duplicate property fact'))).toBe(true);
  });
});
