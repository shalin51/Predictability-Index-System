import { ValidationError } from '../../errors/app-error';
import type { FormulationComponentInput, FormulationSaveInput } from './formulation.types';

const totalTolerance = 0.0001;

export function normalizeFormulationInput(input: Record<string, unknown>): FormulationSaveInput {
  const components = Array.isArray(input['components']) ? input['components'] : [];

  return {
    approve: Boolean(input['approve']),
    components: components.map(normalizeComponent),
    experimentId: stringOrNull(input['experimentId']),
    experimentName: stringValue(input['experimentName']),
    familyId: stringOrNull(input['familyId']),
    formulationCode: stringValue(input['formulationCode']),
    formulationFamily: stringValue(input['formulationFamily']),
    notes: input['notes'] == null ? null : String(input['notes']),
    targetBenchmarkId: stringOrNull(input['targetBenchmarkId']),
  };
}

export function validateFormulationInput(input: FormulationSaveInput): void {
  if (!input.familyId && !input.formulationFamily) {
    throw new ValidationError('Formulation Family is required');
  }

  if (!input.targetBenchmarkId) {
    throw new ValidationError('Target Benchmark is required');
  }

  if (input.components.length === 0) {
    throw new ValidationError('At least one recipe component is required');
  }

  input.components.forEach((component, index) => validateComponent(component, index));

  if (input.approve) {
    validateComponentTotal(input.components);
  }
}

export function validateComponentTotal(components: FormulationComponentInput[]): void {
  const total = sumComponents(components);
  if (Math.abs(total - 100) > totalTolerance) {
    throw new ValidationError('Component total must equal 100% before approval');
  }
}

export function sumComponents(components: FormulationComponentInput[]): number {
  return components.reduce((sum, component) => sum + Number(component.percentComposition || 0), 0);
}

function normalizeComponent(value: unknown): FormulationComponentInput {
  const input = (value ?? {}) as Record<string, unknown>;
  return {
    basis: stringValue(input['basis']) || 'weight_percent',
    materialId: stringValue(input['materialId']),
    materialLotId: stringOrNull(input['materialLotId']),
    percentComposition: Number(input['percentComposition']),
    supplierId: stringValue(input['supplierId']),
  };
}

function validateComponent(component: FormulationComponentInput, index: number): void {
  const row = index + 1;
  if (!component.materialId) throw new ValidationError(`Component ${row}: Material is required`);
  if (!component.supplierId) throw new ValidationError(`Component ${row}: Supplier is required`);
  if (!Number.isFinite(component.percentComposition)) throw new ValidationError(`Component ${row}: Percent Composition must be numeric`);
  if (component.percentComposition < 0) throw new ValidationError(`Component ${row}: Percent Composition cannot be negative`);
  if (component.percentComposition > 100) throw new ValidationError(`Component ${row}: Percent Composition cannot exceed 100%`);
  if (component.basis !== 'weight_percent') throw new ValidationError(`Component ${row}: Basis must be weight_percent`);
}

function stringOrNull(value: unknown): string | null {
  const next = stringValue(value);
  return next || null;
}

function stringValue(value: unknown): string {
  return value == null ? '' : String(value).trim();
}
