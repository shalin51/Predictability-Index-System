import { describe, expect, it } from 'vitest';
import { transferDefinitions } from '../dataTransfer.config';
import { createTransferWorkbook, parseTransferWorkbook } from '../dataTransferWorkbook';

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
        return [column.key, `${column.key}-value`];
      }));
      const bytes = createTransferWorkbook(definition, { [firstSheet!.name]: [sample] });
      const parsed = parseTransferWorkbook(bytes, definition);
      expect(parsed[firstSheet!.name]).toHaveLength(1);
      expect(parsed[firstSheet!.name]?.[0]).toMatchObject(sample);
    }
  );

  it('rejects a workbook for a different resource', () => {
    const bytes = createTransferWorkbook(transferDefinitions['machines']!, {});
    expect(() => parseTransferWorkbook(bytes, transferDefinitions['molds']!)).toThrow(/does not match/);
  });
});
