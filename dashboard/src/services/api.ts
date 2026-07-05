import type {
  DbHealthResponse,
  HealthResponse,
} from '@amfpi/shared';
import { env } from '../config/env';

export interface LibraryFieldDefinition {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'textarea' | 'select';
}

export interface LibraryRecord {
  [key: string]: unknown;
  id: string;
}

export interface LibraryCollectionResponse {
  data: LibraryRecord[];
  fields: LibraryFieldDefinition[];
}

export interface LibraryWeightValidation {
  valid: boolean;
  totalWeight: number;
  message: string;
}

export type FormulationStatus = 'draft' | 'approved' | 'molded' | 'testing' | 'scored' | 'archived';

export interface FormulationComponentPayload {
  basis: 'weight_percent';
  materialId: string;
  materialLotId?: string | null;
  percentComposition: number;
  supplierId: string;
}

export interface FormulationPayload {
  approve?: boolean;
  components: FormulationComponentPayload[];
  experimentId?: string | null;
  experimentName?: string;
  familyId?: string | null;
  formulationCode?: string;
  formulationFamily?: string;
  notes?: string | null;
  targetBenchmarkId?: string | null;
}

export interface FormulationRecord {
  [key: string]: unknown;
  id: string;
  components?: FormulationComponentRecord[];
  componentsTotal: number;
  createdAt: string;
  family: string | null;
  formulationCode: string;
  status: FormulationStatus;
  targetBenchmark: string | null;
  updatedAt: string;
  version: string;
  versionNo: number;
}

export interface FormulationComponentRecord {
  [key: string]: unknown;
  id: string;
  basis: string;
  lotNumber?: string | null;
  lotStatus?: string | null;
  materialCode: string;
  materialId: string;
  materialLotId?: string | null;
  materialName: string;
  percentComposition: number;
  supplierId: string;
  supplierName: string;
}

export interface FormulationOptions {
  experiments: LibraryRecord[];
  families: LibraryRecord[];
}

export type ProductionRunStatus = 'planned' | 'molded' | 'curing' | 'ready_for_testing' | 'testing' | 'completed' | 'scored' | 'archived';

export interface SamplePayload {
  cavityNumber?: number | null;
  sampleCode: string;
  status?: 'created' | 'testing' | 'tested' | 'archived';
}

export interface SampleGenerationPayload {
  cavityAssignments?: Array<number | null>;
  count: number;
  startingSampleCode: string;
}

export interface ProductionRunPayload {
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
  sampleGeneration?: SampleGenerationPayload;
  status?: ProductionRunStatus;
}

export interface SampleRecord {
  [key: string]: unknown;
  id: string;
  cavityNumber?: number | null;
  sampleCode: string;
  status: string;
}

export interface ProductionRunRecord {
  [key: string]: unknown;
  id: string;
  coolingTime?: number | null;
  coolingTimeUnit: string;
  cureHoursBeforeTest: number;
  cycleTime?: number | null;
  cycleTimeUnit: string;
  dateProduced: string;
  formulation: string;
  formulationId: string;
  injectionPressure?: number | null;
  injectionPressureUnit: string;
  machine: string;
  machineId: string;
  meltTemperature?: number | null;
  meltTemperatureUnit: string;
  mold: string;
  moldId: string;
  runCode: string;
  sampleCount: number;
  samples?: SampleRecord[];
  status: ProductionRunStatus;
  targetBenchmark: string | null;
  targetBenchmarkId?: string | null;
  updatedAt: string;
}

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${endpoint}`, options);
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => ({ error: response.statusText }))) as Record<string, string>;
    throw new Error(body['error'] ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function checkHealth(): Promise<HealthResponse> {
  return fetchJSON<HealthResponse>('/health');
}

export async function checkDbHealth(): Promise<DbHealthResponse> {
  return fetchJSON<DbHealthResponse>('/health/db');
}

export async function listLibraryRecords(
  resource: string,
  filters: { category?: string; search?: string; status?: string } = {}
): Promise<LibraryCollectionResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON<LibraryCollectionResponse>(`/library/${resource}${suffix}`);
}

export async function createLibraryRecord(resource: string, payload: Record<string, unknown>): Promise<LibraryRecord> {
  return fetchJSON<LibraryRecord>(`/library/${resource}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateLibraryRecord(resource: string, id: string, payload: Record<string, unknown>): Promise<LibraryRecord> {
  return fetchJSON<LibraryRecord>(`/library/${resource}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function archiveLibraryRecord(resource: string, id: string): Promise<LibraryRecord> {
  return fetchJSON<LibraryRecord>(`/library/${resource}/${id}/archive`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function listLibraryOptions(resource: string): Promise<LibraryRecord[]> {
  return fetchJSON<LibraryRecord[]>(`/library/${resource}/options`);
}

export async function validateLibraryScoringWeights(benchmarkId: string): Promise<LibraryWeightValidation> {
  return fetchJSON<LibraryWeightValidation>(`/library/scoring-rules/validate-weights?benchmarkId=${encodeURIComponent(benchmarkId)}`);
}

export async function listFormulations(filters: Record<string, string> = {}): Promise<FormulationRecord[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON<FormulationRecord[]>(`/formulations${suffix}`);
}

export async function getFormulation(id: string): Promise<FormulationRecord> {
  return fetchJSON<FormulationRecord>(`/formulations/${id}`);
}

export async function createFormulation(payload: FormulationPayload): Promise<FormulationRecord> {
  return fetchJSON<FormulationRecord>('/formulations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateFormulation(id: string, payload: FormulationPayload): Promise<FormulationRecord> {
  return fetchJSON<FormulationRecord>(`/formulations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function approveFormulation(id: string): Promise<FormulationRecord> {
  return fetchJSON<FormulationRecord>(`/formulations/${id}/approve`, { method: 'PUT' });
}

export async function archiveFormulation(id: string): Promise<FormulationRecord> {
  return fetchJSON<FormulationRecord>(`/formulations/${id}/archive`, { method: 'PUT' });
}

export async function duplicateFormulation(id: string): Promise<FormulationRecord> {
  return fetchJSON<FormulationRecord>(`/formulations/${id}/duplicate`, { method: 'POST' });
}

export async function listFormulationOptions(): Promise<FormulationOptions> {
  return fetchJSON<FormulationOptions>('/formulations/options');
}

export async function listProductionRuns(filters: Record<string, string> = {}): Promise<ProductionRunRecord[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON<ProductionRunRecord[]>(`/production-runs${suffix}`);
}

export async function listApprovedFormulationOptions(): Promise<LibraryRecord[]> {
  return fetchJSON<LibraryRecord[]>('/production-runs/approved-formulations');
}

export async function getProductionRun(id: string): Promise<ProductionRunRecord> {
  return fetchJSON<ProductionRunRecord>(`/production-runs/${id}`);
}

export async function createProductionRun(payload: ProductionRunPayload): Promise<ProductionRunRecord> {
  return fetchJSON<ProductionRunRecord>('/production-runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateProductionRun(id: string, payload: ProductionRunPayload): Promise<ProductionRunRecord> {
  return fetchJSON<ProductionRunRecord>(`/production-runs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function archiveProductionRun(id: string): Promise<ProductionRunRecord> {
  return fetchJSON<ProductionRunRecord>(`/production-runs/${id}/archive`, { method: 'POST' });
}

export async function updateProductionRunStatus(id: string, status: ProductionRunStatus): Promise<ProductionRunRecord> {
  return fetchJSON<ProductionRunRecord>(`/production-runs/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function generateSamples(productionRunId: string, payload: SampleGenerationPayload): Promise<SampleRecord[]> {
  return fetchJSON<SampleRecord[]>(`/production-runs/${productionRunId}/samples/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateSample(id: string, payload: SamplePayload): Promise<SampleRecord> {
  return fetchJSON<SampleRecord>(`/samples/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function archiveSample(id: string): Promise<SampleRecord> {
  return fetchJSON<SampleRecord>(`/samples/${id}/archive`, { method: 'POST' });
}
