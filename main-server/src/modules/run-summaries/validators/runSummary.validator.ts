import { ValidationError } from '../../../errors/app-error';

export function validateRunId(runId: string): void {
  if (!runId) throw new ValidationError('Run is required');
}
