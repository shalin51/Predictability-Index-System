import { ValidationError } from '../../../errors/app-error';
import type { EnvironmentalResultInput, SampleResultInput, SubjectiveRatingInput } from '../labTesting.types';

export function normalizeSampleResultInput(input: Record<string, unknown>): SampleResultInput {
  return {
    auditReason: stringValue(input['auditReason']),
    metricId: stringValue(input['metricId']),
    sampleId: stringValue(input['sampleId']),
    testMethodId: nullableString(input['testMethodId']),
    testedAt: stringValue(input['testedAt']),
    testedBy: stringValue(input['testedBy']),
    unit: stringValue(input['unit']),
    valueNumeric: numberValue(input['valueNumeric']),
  };
}

export function normalizeEnvironmentalResultInput(input: Record<string, unknown>): EnvironmentalResultInput {
  return {
    ...normalizeSampleResultInput(input),
    testConditionId: nullableString(input['testConditionId']),
  };
}

export function normalizeSubjectiveRatingInput(input: Record<string, unknown>): SubjectiveRatingInput {
  return {
    auditReason: stringValue(input['auditReason']),
    feedbackText: nullableString(input['feedbackText']),
    metricId: nullableString(input['metricId']),
    ratedAt: stringValue(input['ratedAt']),
    ratedBy: stringValue(input['ratedBy']),
    ratingValue: nullableNumber(input['ratingValue']),
    sampleId: stringValue(input['sampleId']),
  };
}

export function validateSampleResultInput(input: SampleResultInput): void {
  requireString(input.sampleId, 'Sample is required');
  requireString(input.metricId, 'Metric is required');
  if (!Number.isFinite(input.valueNumeric)) throw new ValidationError('Value must be numeric');
}

export function validateSubjectiveRatingInput(input: SubjectiveRatingInput): void {
  requireString(input.sampleId, 'Sample is required');
  if (!input.metricId && !input.feedbackText) throw new ValidationError('Metric or feedback is required');
  if (input.ratingValue != null && (!Number.isFinite(input.ratingValue) || input.ratingValue < 0)) {
    throw new ValidationError('Rating must be zero or greater');
  }
}

function requireString(value: string | undefined, message: string): void {
  if (!value) throw new ValidationError(message);
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  return Number(value);
}

function numberValue(value: unknown): number {
  if (value === null || value === undefined || value === '') return Number.NaN;
  return Number(value);
}

function nullableString(value: unknown): string | null {
  const next = stringValue(value);
  return next || null;
}

function stringValue(value: unknown): string {
  return value == null ? '' : String(value).trim();
}
