export type ProductionRunStatus =
  | 'planned'
  | 'molded'
  | 'curing'
  | 'ready_for_testing'
  | 'testing'
  | 'completed'
  | 'scored'
  | 'archived';

export type SampleStatus = 'created' | 'testing' | 'tested' | 'archived';

export interface ProductionRunListQuery {
  dateProduced?: string;
  formulationId?: string;
  machineId?: string;
  moldId?: string;
  search?: string;
  status?: ProductionRunStatus | 'all';
  targetBenchmarkId?: string;
}

export interface SampleInput {
  cavityNumber?: number | null;
  sampleCode: string;
  status?: SampleStatus;
}

export interface SampleGenerationInput {
  cavityAssignments?: Array<number | null>;
  count: number;
  startingSampleCode: string;
}

export interface ProductionRunInput {
  auditReason?: string;
  coolingTime?: number | null;
  coolingTimeUnit?: string;
  cureHoursBeforeTest?: number;
  cycleTime?: number | null;
  cycleTimeUnit?: string;
  dateProduced: string;
  formulationId: string;
  injectionPressure?: number | null;
  injectionPressureUnit?: string;
  machineId: string;
  meltTemperature?: number | null;
  meltTemperatureUnit?: string;
  moldId: string;
  runCode?: string;
  sampleGeneration?: SampleGenerationInput;
  status?: ProductionRunStatus;
}

export interface ProductionRunRecord {
  [key: string]: unknown;
  id: string;
}
