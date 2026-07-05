import { ValidationError } from '../../errors/app-error';
import type { SampleInput, SampleStatus } from './productionRun.types';

const statuses = new Set<SampleStatus>(['created', 'testing', 'tested', 'archived']);

export function normalizeSampleInput(input: Record<string, unknown>): SampleInput {
  const status = input['status'] ? String(input['status']) as SampleStatus : undefined;
  if (status && !statuses.has(status)) throw new ValidationError('Invalid sample status');
  return {
    cavityNumber: input['cavityNumber'] == null || input['cavityNumber'] === '' ? null : Number(input['cavityNumber']),
    sampleCode: input['sampleCode'] == null ? '' : String(input['sampleCode']).trim(),
    status,
  };
}

export function validateSampleInput(input: SampleInput): void {
  if (!input.sampleCode) throw new ValidationError('Sample Code is required');
  if (input.cavityNumber != null && (!Number.isInteger(input.cavityNumber) || input.cavityNumber < 1)) {
    throw new ValidationError('Cavity Assignment must be a positive integer');
  }
}
