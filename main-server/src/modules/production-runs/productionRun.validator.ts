import { ValidationError } from '../../errors/app-error';
import type { ProductionRunInput, ProductionRunStatus, SampleGenerationInput } from './productionRun.types';

const statuses = new Set<ProductionRunStatus>([
  'planned',
  'molded',
  'curing',
  'ready_for_testing',
  'testing',
  'completed',
  'scored',
  'archived',
]);

export function normalizeProductionRunInput(input: Record<string, unknown>): ProductionRunInput {
  return {
    auditReason: stringValue(input['auditReason']),
    coolingTime: nullableNumber(input['coolingTime']),
    coolingTimeUnit: stringValue(input['coolingTimeUnit']) || 'sec',
    cureHoursBeforeTest: numberValue(input['cureHoursBeforeTest'], 72),
    cycleTime: nullableNumber(input['cycleTime']),
    cycleTimeUnit: stringValue(input['cycleTimeUnit']) || 'sec',
    dateProduced: stringValue(input['dateProduced']),
    formulationId: stringValue(input['formulationId']),
    injectionPressure: nullableNumber(input['injectionPressure']),
    injectionPressureUnit: stringValue(input['injectionPressureUnit']) || 'psi',
    machineId: stringValue(input['machineId']),
    meltTemperature: nullableNumber(input['meltTemperature']),
    meltTemperatureUnit: stringValue(input['meltTemperatureUnit']) || 'C',
    moldId: stringValue(input['moldId']),
    runCode: stringValue(input['runCode']),
    sampleGeneration: normalizeSampleGeneration(input['sampleGeneration']),
    status: normalizeStatus(input['status']),
  };
}

export function validateProductionRunInput(input: ProductionRunInput, partial = false): void {
  if (!partial || input.formulationId) requireString(input.formulationId, 'Formulation is required');
  if (!partial || input.dateProduced) requireString(input.dateProduced, 'Date Produced is required');
  if (!partial || input.machineId) requireString(input.machineId, 'Machine Used is required');
  if (!partial || input.moldId) requireString(input.moldId, 'Mold Used is required');

  validateNonNegative(input.injectionPressure, 'Injection Pressure');
  validateNonNegative(input.meltTemperature, 'Melt Temperature');
  validateNonNegative(input.coolingTime, 'Cooling Time');
  validateNonNegative(input.cycleTime, 'Cycle Time');
  validateNonNegative(input.cureHoursBeforeTest, 'Cure Hours Before Test');

  if (input.sampleGeneration) validateSampleGeneration(input.sampleGeneration);
}

export function nextProductionRunStatus(current: ProductionRunStatus, requested: ProductionRunStatus): void {
  const flow: ProductionRunStatus[] = ['planned', 'molded', 'curing', 'ready_for_testing', 'testing', 'completed', 'scored'];
  const currentIndex = flow.indexOf(current);
  const requestedIndex = flow.indexOf(requested);
  if (currentIndex < 0 || requestedIndex !== currentIndex + 1) {
    throw new ValidationError(`Cannot move production run from ${current} to ${requested}`);
  }
}

function normalizeSampleGeneration(value: unknown): SampleGenerationInput | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  const assignments = Array.isArray(input['cavityAssignments']) ? input['cavityAssignments'] : [];
  return {
    cavityAssignments: assignments.map((item) => item == null || item === '' ? null : Number(item)),
    count: numberValue(input['count'], 0),
    startingSampleCode: stringValue(input['startingSampleCode']),
  };
}

function validateSampleGeneration(input: SampleGenerationInput): void {
  if (!Number.isInteger(input.count) || input.count < 1) {
    throw new ValidationError('Number of Samples must be at least 1');
  }
  requireString(input.startingSampleCode, 'Starting Sample Code is required');
}

function normalizeStatus(value: unknown): ProductionRunStatus | undefined {
  if (!value) return undefined;
  const status = String(value) as ProductionRunStatus;
  if (!statuses.has(status)) throw new ValidationError('Invalid production run status');
  return status;
}

function requireString(value: string | undefined, message: string): void {
  if (!value) throw new ValidationError(message);
}

function validateNonNegative(value: number | null | undefined, label: string): void {
  if (value != null && (!Number.isFinite(value) || value < 0)) {
    throw new ValidationError(`${label} must be zero or greater`);
  }
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  return Number(value);
}

function numberValue(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  return Number(value);
}

function stringValue(value: unknown): string {
  return value == null ? '' : String(value).trim();
}
