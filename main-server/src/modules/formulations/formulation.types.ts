export type FormulationStatus = 'draft' | 'approved' | 'molded' | 'testing' | 'scored' | 'archived';

export interface FormulationListQuery {
  createdFrom?: string;
  createdTo?: string;
  materialId?: string;
  search?: string;
  status?: FormulationStatus | 'all';
  targetBenchmarkId?: string;
}

export interface FormulationComponentInput {
  basis?: string;
  materialId: string;
  materialLotId?: string | null;
  percentComposition: number;
  supplierId: string;
}

export interface FormulationSaveInput {
  approve?: boolean;
  experimentId?: string | null;
  experimentName?: string;
  formulationCode?: string;
  formulationFamily?: string;
  familyId?: string | null;
  notes?: string | null;
  targetBenchmarkId?: string | null;
  components: FormulationComponentInput[];
}

export interface FormulationRecord {
  [key: string]: unknown;
  id: string;
}

export interface FormulationOptions {
  experiments: FormulationRecord[];
  families: FormulationRecord[];
}
