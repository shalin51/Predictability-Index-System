import { ValidationError } from '../../../errors/app-error';
import type { LabTestingQueueQuery } from '../labTesting.types';

const queueStatuses = new Set(['ready_for_testing', 'testing', 'all']);

export function normalizeQueueQuery(query: Record<string, unknown>): LabTestingQueueQuery {
  const status = stringValue(query['status']) as LabTestingQueueQuery['status'];
  if (status && !queueStatuses.has(status)) throw new ValidationError('Invalid lab queue status');
  return {
    dateProduced: stringValue(query['dateProduced']),
    machineId: stringValue(query['machineId']),
    missingResults: stringValue(query['missingResults']),
    moldId: stringValue(query['moldId']),
    search: stringValue(query['search']),
    status: status || 'all',
    targetBenchmarkId: stringValue(query['targetBenchmarkId']),
  };
}

function stringValue(value: unknown): string {
  return value == null ? '' : String(value).trim();
}
