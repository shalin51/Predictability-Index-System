import { ValidationError } from '../../../errors/app-error';

export function validateRunId(runId: string): void {
  if (!runId) throw new ValidationError('Run is required');
}

export function validateReportId(scoreReportId: string): void {
  if (!scoreReportId) throw new ValidationError('Score report is required');
}

export function validateBenchmarkId(benchmarkId: string): void {
  if (!benchmarkId) throw new ValidationError('Benchmark is required');
}
