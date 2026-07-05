import { ValidationError } from '../../../errors/app-error';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateReportId(value: string): void {
  validateUuid(value, 'Report id');
}

export function validateRunId(value: string): void {
  validateUuid(value, 'Production run id');
}

export function normalizeUserId(value: string): string | null {
  return uuidPattern.test(value) ? value : null;
}

function validateUuid(value: string, label: string): void {
  if (!uuidPattern.test(value)) {
    throw new ValidationError(`${label} must be a UUID`);
  }
}
