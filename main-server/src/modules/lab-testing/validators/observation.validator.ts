import { ValidationError } from '../../../errors/app-error';
import type { ObservationInput } from '../labTesting.types';

export function normalizeObservationInput(input: Record<string, unknown>): ObservationInput {
  return {
    auditReason: stringValue(input['auditReason']),
    observationText: stringValue(input['observationText']),
    observationType: stringValue(input['observationType']) || 'general',
    observedAt: stringValue(input['observedAt']),
    observedBy: stringValue(input['observedBy']),
    sampleId: stringValue(input['sampleId']),
  };
}

export function validateObservationInput(input: ObservationInput): void {
  if (!input.sampleId) throw new ValidationError('Sample is required');
  if (!input.observationText) throw new ValidationError('Observation is required');
}

function stringValue(value: unknown): string {
  return value == null ? '' : String(value).trim();
}
