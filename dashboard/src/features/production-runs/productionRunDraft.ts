import type { ProductionRunPayload } from '../../services/api';

export function createProductionRunDraft(dateProduced: string): ProductionRunPayload {
  return {
    coolingTimeUnit: 'sec',
    cureHoursBeforeTest: 72,
    cycleTimeUnit: 'sec',
    dateProduced,
    formulationId: '',
    injectionPressureUnit: 'psi',
    machineId: '',
    meltTemperatureUnit: 'C',
    moldId: '',
    sampleGeneration: { count: 5, startingSampleCode: '' },
    status: 'planned',
  };
}
