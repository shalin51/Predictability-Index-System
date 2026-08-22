import { FORMULATION_STATUSES } from '../../constants/domain.constants';

export type FormulationStatus = typeof FORMULATION_STATUSES[number];

export interface FormulationListQuery {
  createdFrom?: string;
  createdTo?: string;
  materialId?: string;
  search?: string;
  status?: FormulationStatus | 'all';
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
  approvedBy?: string | null;
  formulationCode?: string;
  formulationName?: string;
  notes?: string | null;
  components: FormulationComponentInput[];
}

export interface FormulationRecord {
  [key: string]: unknown;
  id: string;
}
