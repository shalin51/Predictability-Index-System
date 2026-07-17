export type ProcessValue = number | string | null;

export interface ParsedProcessParameter {
  key: string;
  section: string;
  positionType: string;
  positionIndex?: number | null;
  positionLabel?: string | null;
  setpoint?: ProcessValue;
  actual?: ProcessValue;
  valueDate?: string | null;
  unit?: string | null;
  toleranceMin?: number | null;
  toleranceMax?: number | null;
  notes?: string | null;
  sortOrder: number;
}

export interface ParsedRevisionLogEntry {
  revisionNo: string;
  revisionDate?: string | null;
  changedBy?: string | null;
  approvedBy?: string | null;
  description?: string | null;
  machineStatus?: string | null;
  sortOrder: number;
}

export interface ParsedMaterialProfile {
  tradeName?: string | null;
  manufacturer?: string | null;
  grade?: string | null;
  colorPigment?: string | null;
  meltFlowIndex?: number | null;
  specificGravity?: number | null;
  shrinkRate?: number | null;
  moistureAbsorptionPct?: number | null;
  ranges: Array<{
    parameterKey: string;
    displayName: string;
    minValue?: number | null;
    maxValue?: number | null;
    recommendedValue?: number | null;
    unit?: string | null;
    notes?: string | null;
    sortOrder: number;
  }>;
}

export interface ParsedDryingEvent {
  date?: string | null;
  lotNumber?: string | null;
  dryerCode?: string | null;
  setpointTemperature?: number | null;
  actualTemperature?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  durationHours?: number | null;
  approvedBy?: string | null;
}

export interface ParsedSetupWorkbook {
  templateKey: 'boy-125e';
  templateVersion: 'v1';
  header: {
    jobName?: string | null;
    partNumber?: string | null;
    materialName?: string | null;
    materialLotNumber?: string | null;
    moldCode?: string | null;
    moldDescription?: string | null;
    machineCode?: string | null;
    productionDate?: string | null;
    operatorName?: string | null;
    shiftCode?: string | null;
    revisionNo?: string | null;
    approvedBy?: string | null;
  };
  hotRunner: {
    moldCode?: string | null;
    productionDate?: string | null;
    operatorName?: string | null;
    manufacturer?: string | null;
    controllerModel?: string | null;
    zoneCount?: number | null;
    zoneNumbers: number[];
  };
  parameters: ParsedProcessParameter[];
  notes: Array<{ type: string; text: string }>;
  revisions: ParsedRevisionLogEntry[];
  materialProfile: ParsedMaterialProfile;
  dryingEvents: ParsedDryingEvent[];
  hasActualReadings: boolean;
}

export interface ImportValidationResults {
  errors: string[];
  warnings: string[];
}

export interface SetupImportCommitInput {
  formulationId: string;
  machineId: string;
  moldId: string;
  primaryFormulationComponentId?: string | null;
  materialLotId?: string | null;
  materialId?: string | null;
  runCode?: string | null;
  cureHoursBeforeTest?: number;
  initialStatus?: 'planned' | 'molded';
  sampleGeneration?: {
    count: number;
    startingSampleCode: string;
    cavityAssignments?: Array<number | null>;
  };
}

export interface ProcessSetupRecord {
  [key: string]: unknown;
  id: string;
}
