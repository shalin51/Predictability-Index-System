import type { ProductionRunPayload, ProductionRunRecord } from '../../services/api';

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

export function duplicateProductionRunDraft(source: ProductionRunRecord, dateProduced: string): ProductionRunPayload {
  const samples = source.samples ?? [];

  return {
    coolingTime: source.coolingTime ?? null,
    coolingTimeUnit: source.coolingTimeUnit,
    cureHoursBeforeTest: source.cureHoursBeforeTest,
    cycleTime: source.cycleTime ?? null,
    cycleTimeUnit: source.cycleTimeUnit,
    dateProduced,
    formulationId: source.formulationId,
    injectionPressure: source.injectionPressure ?? null,
    injectionPressureUnit: source.injectionPressureUnit,
    machineId: source.machineId,
    meltTemperature: source.meltTemperature ?? null,
    meltTemperatureUnit: source.meltTemperatureUnit,
    moldId: source.moldId,
    runCode: '',
    sampleGeneration: {
      cavityAssignments: samples.map((sample) => sample.cavityNumber ?? null),
      count: samples.length || source.sampleCount || 5,
      startingSampleCode: '',
    },
    status: 'planned',
  };
}
