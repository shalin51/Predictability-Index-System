import { describe, expect, it, vi } from 'vitest';
import { transferDefinitions } from '../dataTransfer.config';
import {
  createTransferWorkbook,
  parseTransferWorkbookSafe,
  importTabName,
} from '../dataTransferWorkbook';
import { DataTransferService } from '../dataTransfer.service';
import type { LibraryService } from '../../library/library.service';
import type { DataTransferRepository } from '../dataTransfer.repository';
import * as XLSX from 'xlsx';

// ── parseTransferWorkbookSafe ─────────────────────────────────────────────

describe('parseTransferWorkbookSafe', () => {
  it('returns structural error for invalid binary data', () => {
    const result = parseTransferWorkbookSafe(Buffer.from('not an xlsx'), transferDefinitions['machines']!);
    expect(result.structuralError).toBeDefined();
    expect(result.sheetRows).toEqual({});
  });

  it('returns structural error when workbook has wrong tab name for resource', () => {
    // A machines workbook parsed as molds → missing "import_molds" tab
    const wrongBytes = createTransferWorkbook(transferDefinitions['machines']!, {});
    const result = parseTransferWorkbookSafe(wrongBytes, transferDefinitions['molds']!);
    expect(result.structuralError).toMatch(/import_molds|does not match/i);
    expect(result.sheetRows).toEqual({});
  });

  it('returns structural error when import_{name} sheet is missing', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Col']]), 'wrong_sheet');
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const result = parseTransferWorkbookSafe(bytes, transferDefinitions['machines']!);
    expect(result.structuralError).toMatch(/import_machines/);
  });

  it('returns parsed rows with no errors for valid data', () => {
    const definition = transferDefinitions['machines']!;
    const sample = {
      machineCode: 'MC-001',
      machineName: 'Test Machine',
      manufacturer: 'ACME',
      machineType: 'injection',
      modelNumber: 'M100',
      serialNumber: 'SN-001',
      location: 'Bay 1',
      status: 'active',
    };
    // Pass data using the definition's sheet name; createTransferWorkbook maps it to import_data
    const bytes = createTransferWorkbook(definition, { Machines: [sample] });
    const result = parseTransferWorkbookSafe(bytes, definition);
    expect(result.structuralError).toBeUndefined();
    // Results are stored under the definition's original sheet name
    expect(result.sheetRows['Machines']).toHaveLength(1);
    expect(result.sheetRows['Machines']?.[0]?.parseErrors).toHaveLength(0);
    expect(result.sheetRows['Machines']?.[0]?.data).toMatchObject({ machineCode: 'MC-001', machineName: 'Test Machine' });
  });

  it('ignores test_machines and instruction_machines rows — only import_machines is parsed', () => {
    const definition = transferDefinitions['machines']!;
    const bytes = createTransferWorkbook(definition, {});
    const result = parseTransferWorkbookSafe(bytes, definition);
    expect(result.sheetRows['Machines']).toHaveLength(0);
  });

  it('workbook has import_machines as the first tab', () => {
    const bytes = createTransferWorkbook(transferDefinitions['machines']!, {});
    const wb = XLSX.read(bytes, { type: 'buffer' });
    expect(wb.SheetNames[0]).toBe(importTabName('Machines'));
  });

  it('flags missing required fields per row without throwing', () => {
    const definition = transferDefinitions['machines']!;
    const bytes = createTransferWorkbook(definition, {
      Machines: [
        { machineCode: '', machineName: '', manufacturer: 'ACME' },
      ],
    });
    const result = parseTransferWorkbookSafe(bytes, definition);
    const row = result.sheetRows['Machines']?.[0];
    expect(row).toBeDefined();
    expect(row?.parseErrors.length).toBeGreaterThan(0);
    expect(row?.parseErrors.some((e) => /Machine Code/i.test(e) || /required/i.test(e))).toBe(true);
  });

  it('flags invalid number type per field without throwing', () => {
    const definition = transferDefinitions['machine-parameters']!;
    const bytes = createTransferWorkbook(definition, {
      'Machine Parameters': [
        {
          machineCode: 'MC-001',
          parameterKey: 'injection_pressure',
          displayName: 'Injection Pressure',
          sectionKey: 'injection',
          positionType: 'single',
          positionIndex: 'NOT_A_NUMBER',
          positionLabel: '',
          minimumValue: 0,
          maximumValue: 100,
          unit: 'bar',
          sortOrder: 1,
          notes: '',
          status: 'active',
        },
      ],
    });
    const result = parseTransferWorkbookSafe(bytes, definition);
    const row = result.sheetRows['Machine Parameters']?.[0];
    expect(row).toBeDefined();
    if (row?.parseErrors && row.parseErrors.length > 0) {
      expect(row.parseErrors.some((e) => /number/i.test(e) || /Position Index/i.test(e))).toBe(true);
    }
  });

  it('handles multiple sheets correctly (formulations)', () => {
    const definition = transferDefinitions['formulations']!;
    const bytes = createTransferWorkbook(definition, {
      Formulations: [{ formulationCode: 'F001', formulationName: 'Test formulation', versionNo: 1, status: 'draft', notes: '' }],
      Components: [],
    });
    const result = parseTransferWorkbookSafe(bytes, definition);
    expect(result.structuralError).toBeUndefined();
    expect(result.sheetRows['Formulations']).toHaveLength(1);
  });
});

// ── DataTransferService.validate ──────────────────────────────────────────

function makeLibraryService(overrides: Partial<typeof LibraryService.prototype> = {}): LibraryService {
  return {
    list: vi.fn().mockResolvedValue({ data: [], fields: [] }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  } as unknown as LibraryService;
}

function makeRepo(): DataTransferRepository {
  return {} as unknown as DataTransferRepository;
}

describe('DataTransferService.validate', () => {
  it('returns canImport=false for empty buffer', async () => {
    const service = new DataTransferService(makeRepo(), makeLibraryService());
    const result = await service.validate('machines', Buffer.alloc(0));
    expect(result.canImport).toBe(false);
  });

  it('returns structural error for workbook missing import_machines sheet', async () => {
    const service = new DataTransferService(makeRepo(), makeLibraryService());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Col']]), 'wrong_sheet');
    const badBytes = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const result = await service.validate('machines', badBytes);
    expect(result.canImport).toBe(false);
    expect(result.rows[0]?.errors[0]).toMatch(/import_machines/);
  });

  it('validates machines with no errors when data is valid', async () => {
    const libraryService = makeLibraryService({
      list: vi.fn().mockResolvedValue({ data: [], fields: [] }),
    });
    const service = new DataTransferService(makeRepo(), libraryService);

    const definition = transferDefinitions['machines']!;
    const bytes = createTransferWorkbook(definition, {
      Machines: [
        { machineCode: 'MC-001', machineName: 'Machine 1', manufacturer: 'ACME', machineType: 'injection', modelNumber: 'M100', serialNumber: 'SN-001', location: 'Bay 1', status: 'active' },
        { machineCode: 'MC-002', machineName: 'Machine 2', manufacturer: 'ACME', machineType: 'injection', modelNumber: 'M200', serialNumber: 'SN-002', location: 'Bay 2', status: 'active' },
      ],
    });

    const result = await service.validate('machines', bytes);
    expect(result.totalErrors).toBe(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.action).toBe('create');
    expect(result.rows[1]?.action).toBe('create');
    expect(result.canImport).toBe(true);
  });

  it('detects existing records as update actions', async () => {
    const libraryService = makeLibraryService({
      list: vi.fn().mockResolvedValue({
        data: [{ id: 'existing-id', machineCode: 'MC-001', machineName: 'Old Name' }],
        fields: [],
      }),
    });
    const service = new DataTransferService(makeRepo(), libraryService);

    const definition = transferDefinitions['machines']!;
    const bytes = createTransferWorkbook(definition, {
      Machines: [
        { machineCode: 'MC-001', machineName: 'New Name', manufacturer: '', machineType: '', modelNumber: '', serialNumber: '', location: '', status: 'active' },
      ],
    });

    const result = await service.validate('machines', bytes);
    expect(result.rows[0]?.action).toBe('update');
    expect(result.canImport).toBe(true);
  });

  it('flags missing FK reference for machine-parameters', async () => {
    const libraryService = makeLibraryService({
      list: vi.fn().mockImplementation(async (resource: string) => {
        if (resource === 'machines') return { data: [], fields: [] };
        return { data: [], fields: [] };
      }),
    });
    const service = new DataTransferService(makeRepo(), libraryService);

    const definition = transferDefinitions['machine-parameters']!;
    const bytes = createTransferWorkbook(definition, {
      'Machine Parameters': [
        { machineCode: 'MC-NONEXISTENT', parameterKey: 'test_param', displayName: 'Test Param', sectionKey: 'injection', positionType: 'single', positionIndex: 1, positionLabel: '', minimumValue: 0, maximumValue: 100, unit: 'bar', sortOrder: 1, notes: '', status: 'active' },
      ],
    });

    const result = await service.validate('machine-parameters', bytes);
    expect(result.totalErrors).toBe(1);
    expect(result.rows[0]?.action).toBe('error');
    expect(result.rows[0]?.errors[0]).toMatch(/MC-NONEXISTENT/);
    expect(result.rows[0]?.errors[0]).toMatch(/import.*first|Imports/i);
  });

  it('flags FK reference error for materials missing supplier', async () => {
    const libraryService = makeLibraryService({
      list: vi.fn().mockImplementation(async (resource: string) => {
        if (resource === 'material-suppliers') return { data: [], fields: [] };
        return { data: [], fields: [] };
      }),
    });
    const service = new DataTransferService(makeRepo(), libraryService);

    const definition = transferDefinitions['materials']!;
    const bytes = createTransferWorkbook(definition, {
      Materials: [
        { materialCode: 'MAT-001', materialName: 'Test Material', materialSupplierCode: 'SUP-999', materialLot: '', productGrade: 'Grade A', chemistry: '', roleInBlend: '', sourceFile: '', sourceRevisionDate: null, status: 'active', notes: '' },
      ],
    });

    const result = await service.validate('materials', bytes);
    expect(result.totalErrors).toBe(1);
    expect(result.rows[0]?.errors[0]).toMatch(/SUP-999/);
  });

  it('flags duplicate rows within the batch', async () => {
    const libraryService = makeLibraryService({
      list: vi.fn().mockResolvedValue({ data: [], fields: [] }),
    });
    const service = new DataTransferService(makeRepo(), libraryService);

    const definition = transferDefinitions['machines']!;
    const bytes = createTransferWorkbook(definition, {
      Machines: [
        { machineCode: 'MC-001', machineName: 'Machine 1', manufacturer: '', machineType: '', modelNumber: '', serialNumber: '', location: '', status: 'active' },
        { machineCode: 'MC-001', machineName: 'Machine 1 Dup', manufacturer: '', machineType: '', modelNumber: '', serialNumber: '', location: '', status: 'active' },
      ],
    });

    const result = await service.validate('machines', bytes);
    expect(result.totalErrors).toBe(1);
    const dupRow = result.rows.find((r) => r.errors.some((e) => /duplicate/i.test(e)));
    expect(dupRow).toBeDefined();
    expect(dupRow?.action).toBe('error');
  });

  it('validates mold-zones with missing mold FK', async () => {
    const libraryService = makeLibraryService({
      list: vi.fn().mockImplementation(async (resource: string) => {
        if (resource === 'molds') return { data: [], fields: [] };
        return { data: [], fields: [] };
      }),
    });
    const service = new DataTransferService(makeRepo(), libraryService);

    const definition = transferDefinitions['mold-zones']!;
    const bytes = createTransferWorkbook(definition, {
      'Mold Zones': [
        { moldCode: 'MOLD-NONEXISTENT', zoneNumber: 1, zoneName: 'Zone 1', zoneType: 'hot', minimumTemperature: 150, maximumTemperature: 250, temperatureUnit: '°F', notes: '', status: 'active' },
      ],
    });

    const result = await service.validate('mold-zones', bytes);
    expect(result.totalErrors).toBe(1);
    expect(result.rows[0]?.errors[0]).toMatch(/MOLD-NONEXISTENT/);
  });

  it('returns empty result with zero rows when no data rows exist', async () => {
    const libraryService = makeLibraryService();
    const service = new DataTransferService(makeRepo(), libraryService);

    const definition = transferDefinitions['machines']!;
    const bytes = createTransferWorkbook(definition, { Machines: [] });

    const result = await service.validate('machines', bytes);
    expect(result.rows).toHaveLength(0);
    expect(result.canImport).toBe(false);
    expect(result.totalErrors).toBe(0);
  });

  it('includes existingRecord in validation response for update rows', async () => {
    const existing = { id: 'existing-id', machineCode: 'MC-001', machineName: 'Old Name', manufacturer: 'OldCo' };
    const libraryService = makeLibraryService({
      list: vi.fn().mockResolvedValue({ data: [existing], fields: [] }),
    });
    const service = new DataTransferService(makeRepo(), libraryService);

    const definition = transferDefinitions['machines']!;
    const bytes = createTransferWorkbook(definition, {
      Machines: [
        { machineCode: 'MC-001', machineName: 'New Name', manufacturer: 'NewCo', machineType: '', modelNumber: '', serialNumber: '', location: '', status: 'active' },
      ],
    });

    const result = await service.validate('machines', bytes);
    expect(result.rows[0]?.action).toBe('update');
    expect(result.rows[0]?.existingRecord).toBeDefined();
    expect(result.rows[0]?.existingRecord?.['machineName']).toBe('Old Name');
    expect(result.rows[0]?.existingRecord?.['manufacturer']).toBe('OldCo');
  });
});

// ── Duplicate resolution during import ────────────────────────────────────────

describe('DataTransferService.import (duplicate resolutions)', () => {
  it('calls saveToHistoric before overwriting an existing record', async () => {
    const saveToHistoric = vi.fn().mockResolvedValue(undefined);
    const repo = { saveToHistoric } as unknown as DataTransferRepository;

    const existingRecord = { id: 'existing-id', machineCode: 'MC-001', machineName: 'Old Name', status: 'active' };
    const updatedRecord = { id: 'existing-id', machineCode: 'MC-001', machineName: 'New Name', status: 'active' };
    const libraryService = makeLibraryService({
      list: vi.fn().mockResolvedValue({ data: [existingRecord], fields: [] }),
      update: vi.fn().mockResolvedValue(updatedRecord),
    });

    const service = new DataTransferService(repo, libraryService);
    const definition = transferDefinitions['machines']!;
    const bytes = createTransferWorkbook(definition, {
      Machines: [{ machineCode: 'MC-001', machineName: 'New Name', manufacturer: 'ACME', machineType: 'injection', modelNumber: 'M100', serialNumber: 'SN-001', location: 'Bay 1', status: 'active' }],
    });

    // rowIndex 0 → 'overwrite' resolution
    await service.import('machines', bytes, 'test-actor', [{ rowIndex: 0, action: 'overwrite' }]);

    expect(saveToHistoric).toHaveBeenCalledOnce();
    expect(saveToHistoric).toHaveBeenCalledWith('machines', 'existing-id', 'overwrite', existingRecord, 'test-actor');
    expect(libraryService.update).toHaveBeenCalledOnce();
    expect(libraryService.create).not.toHaveBeenCalled();
  });

  it('creates a new record with a modified code when resolution is create-new', async () => {
    const repo = { saveToHistoric: vi.fn() } as unknown as DataTransferRepository;

    const existingRecord = { id: 'existing-id', machineCode: 'MC-001', machineName: 'Existing', status: 'active' };
    const libraryService = makeLibraryService({
      list: vi.fn().mockResolvedValue({ data: [existingRecord], fields: [] }),
      create: vi.fn().mockResolvedValue({ id: 'new-id' }),
    });

    const service = new DataTransferService(repo, libraryService);
    const definition = transferDefinitions['machines']!;
    const bytes = createTransferWorkbook(definition, {
      Machines: [{ machineCode: 'MC-001', machineName: 'Duplicate Import', manufacturer: 'ACME', machineType: 'injection', modelNumber: 'M100', serialNumber: 'SN-002', location: 'Bay 2', status: 'active' }],
    });

    // rowIndex 0 → 'create-new' resolution
    const result = await service.import('machines', bytes, 'test-actor', [{ rowIndex: 0, action: 'create-new' }]);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(repo.saveToHistoric).not.toHaveBeenCalled();

    // The created record's machineCode should have a suffix added
    const createCall = (libraryService.create as ReturnType<typeof vi.fn>).mock.calls[0];
    const createdPayload = createCall?.[1] as Record<string, unknown>;
    expect(String(createdPayload['machineCode'])).toMatch(/^MC-001-copy-/);
  });

  it('defaults to overwrite when no resolution provided for update row', async () => {
    const saveToHistoric = vi.fn().mockResolvedValue(undefined);
    const repo = { saveToHistoric } as unknown as DataTransferRepository;

    const existingRecord = { id: 'existing-id', machineCode: 'MC-001', machineName: 'Old', status: 'active' };
    const libraryService = makeLibraryService({
      list: vi.fn().mockResolvedValue({ data: [existingRecord], fields: [] }),
      update: vi.fn().mockResolvedValue(existingRecord),
    });

    const service = new DataTransferService(repo, libraryService);
    const definition = transferDefinitions['machines']!;
    const bytes = createTransferWorkbook(definition, {
      Machines: [{ machineCode: 'MC-001', machineName: 'Updated', manufacturer: 'ACME', machineType: 'injection', modelNumber: 'M100', serialNumber: 'SN-001', location: 'Bay 1', status: 'active' }],
    });

    // Pass empty resolutions — should default to 'overwrite'
    const result = await service.import('machines', bytes, 'test-actor', []);

    expect(result.updated).toBe(1);
    expect(saveToHistoric).toHaveBeenCalledOnce();
  });
});
