export interface PredictionComponent {
  material_id: string;
  material_code: string;
  supplier_id?: string | null;
  material_lot_id?: string | null;
  percent_composition: number;
  basis: string;
}

export interface PredictionProcessParameter {
  parameter_definition_id: string;
  parameter_key: string;
  position_type: string;
  position_index?: number | null;
  position_label?: string | null;
  value_numeric?: number | null;
  value_text?: string | null;
  unit?: string | null;
}

export interface PredictionInputSnapshot {
  formula: {
    formulation_id: string;
    formulation_code: string;
    version_no: number;
    components: PredictionComponent[];
  };
  machine_id: string;
  machine_code: string;
  mold_id: string;
  mold_code: string;
  process_parameters: PredictionProcessParameter[];
  environment_observations: never[];
  process: Record<string, never>;
}

export interface ProcessorPredictionResponse {
  model_id: string;
  predictions: Record<string, number>;
}

export interface PredictionRecord {
  id: string;
  productionRunId: string;
  modelId: string;
  modelLabel?: string;
  requestedBy: string;
  generatedAt: string;
  startedAt: string;
  completedAt: string | null;
  failureMessage: string | null;
  status: 'running' | 'completed' | 'failed';
  metrics: Array<{
    metricId: string | null;
    metricKey: string;
    metricName: string;
    conditionCode: string | null;
    predictedValue: number;
    unit: string | null;
  }>;
}
