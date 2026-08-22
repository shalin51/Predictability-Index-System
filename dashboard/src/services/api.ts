import type {
  DbHealthResponse,
  HealthResponse,
} from '@amfpi/shared';
import { FORMULATION_STATUSES, PRODUCTION_RUN_STATUSES, SAMPLE_STATUSES } from '@amfpi/shared';
import { env } from '../config/env';
import { clearAuthSession, getAccessToken } from '../features/auth/authSession';

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

export interface DataTransferImportResult {
  created: number;
  errors: string[];
  processed: number;
  skipped: number;
  updated: number;
}

export interface GlobalBenchmarkRegenerationResult {
  benchmarkId: string;
  benchmarkName: string;
  runsScored: number;
  runsSkipped: number;
}

export type FormulationStatus = typeof FORMULATION_STATUSES[number];

export interface FormulationComponentPayload {
  basis: 'weight_percent';
  materialId: string;
  materialLotId?: string | null;
  percentComposition: number;
  supplierId: string;
}

export interface FormulationPayload {
  approve?: boolean;
  approvedBy?: string | null;
  components: FormulationComponentPayload[];
  formulationCode?: string;
  formulationName?: string;
  notes?: string | null;
}

export interface FormulationRecord {
  [key: string]: unknown;
  id: string;
  components?: FormulationComponentRecord[];
  componentsTotal: number;
  createdAt: string;
  formulationCode: string;
  formulationName?: string | null;
  approvedBy?: string | null;
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


export type ProductionRunStatus = typeof PRODUCTION_RUN_STATUSES[number];

export interface SamplePayload {
  cavityNumber?: number | null;
  sampleCode: string;
  status?: typeof SAMPLE_STATUSES[number];
}

export interface SampleGenerationPayload {
  cavityAssignments?: Array<number | null>;
  count: number;
  startingSampleCode: string;
}

export interface ProductionRunPayload {
  approvedBy?: string | null;
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
  processSetupRevisionId?: string | null;
  jobName?: string | null;
  partNumber?: string | null;
  operatorName?: string | null;
  shiftCode?: string | null;
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
  approvedBy?: string | null;
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
  processSetupRevisionId?: string | null;
  jobName?: string | null;
  partNumber?: string | null;
  operatorName?: string | null;
  shiftCode?: string | null;
  runCode: string;
  sampleCount: number;
  samples?: SampleRecord[];
  status: ProductionRunStatus;
  targetBenchmark: string | null;
  updatedAt: string;
}

export interface SetupImportPreview {
  id: string;
  status: string;
  originalFilename: string;
  parsedSnapshot: {
    header: Record<string, string | number | boolean | null | undefined>;
    parameters: Array<Record<string, unknown>>;
    notes: Array<Record<string, unknown>>;
    revisions: Array<Record<string, unknown>>;
    materialProfile: Record<string, unknown>;
    dryingEvents: Array<Record<string, unknown>>;
    hasActualReadings: boolean;
  };
  validationResults: { errors: string[]; warnings: string[] };
  requiredResolutions: string[];
  sectionSummaries: Array<{ section: string; parameterCount: number; setpointCount: number; actualCount: number }>;
  matches: {
    machines: LibraryRecord[];
    molds: LibraryRecord[];
    materials: LibraryRecord[];
    lots: LibraryRecord[];
    formulations: LibraryRecord[];
    formulationComponents: LibraryRecord[];
  };
  defaultInitialStatus: 'planned' | 'molded';
  productionRunId?: string | null;
}

export interface MaterialImportPreview {
  id: string;
  status: string;
  originalFilename: string;
  validationResults: { errors: string[]; warnings: string[] };
  summary: {
    materials: number;
    propertyDefinitions: number;
    propertyFacts: number;
    createMaterials: number;
    matchedMaterials: number;
  };
  matches: Array<{
    externalId: string;
    productGrade: string;
    manufacturer: string;
    matchedMaterialId?: string | null;
    matchedMaterialCode?: string | null;
    action: 'match' | 'create';
  }>;
  materialOptions: LibraryRecord[];
  commitSummary?: Record<string, number> | null;
}

export interface MaterialCatalogDetail extends LibraryRecord {
  chemistry?: string | null;
  materialLot?: string | null;
  materialCode: string;
  materialName: string;
  materialSupplierId?: string | null;
  notes?: string | null;
  productGrade?: string | null;
  properties: Array<{
    id: string;
    notes?: string | null;
    category: string;
    propertyKey: string;
    propertyDefinitionId?: string;
    propertyName: string;
    qualifier?: string | null;
    sourceFilename?: string | null;
    testCondition?: string | null;
    testMethod: string;
    unit?: string | null;
    valueNumeric?: number | null;
    valueText?: string | null;
  }>;
  roleInBlend?: string | null;
  sourceFile?: string | null;
  sourceRevisionDate?: string | null;
  supplierName?: string | null;
}

export interface MaterialPropertyDefinitionOption {
  id: string;
  category: string;
  commonUnits?: string | null;
  propertyKey: string;
  propertyName: string;
  valueType: string;
}

export interface MaterialPropertyInput {
  notes?: string | null;
  propertyDefinitionId: string;
  qualifier?: string | null;
  testCondition?: string | null;
  testMethod?: string;
  unit?: string | null;
  valueNumeric?: number | string | null;
  valueText?: string | null;
}

export interface MaterialPropertyDefinitionInput {
  category: string;
  commonUnits?: string | null;
  implementationNotes?: string | null;
  propertyKey?: string;
  propertyName: string;
  valueType?: string;
}

export interface ProcessSetupDetail extends LibraryRecord {
  values?: Array<Record<string, unknown>>;
  parameters?: Array<Record<string, unknown>>;
  notes?: Array<Record<string, unknown>>;
  materialProfile?: Array<Record<string, unknown>>;
  dryingEvents?: Array<Record<string, unknown>>;
  revisionHistory?: Array<Record<string, unknown>>;
}

export type LabMetricCategory = 'physical' | 'performance' | 'durability' | 'environmental' | 'subjective';

export interface LabTestingQueueRecord {
  [key: string]: unknown;
  id: string;
  completedResults: number;
  cureHoursBeforeTest: number;
  dateProduced: string;
  formulation: string;
  formulationId: string;
  machine: string;
  machineId: string;
  missingRequiredMetrics: number;
  mold: string;
  moldId: string;
  requiredResultCount: number;
  runCode: string;
  sampleCount: number;
  status: 'ready_for_testing' | 'testing' | 'completed' | 'scored';
  targetBenchmark: string | null;
}

export interface LabMetric {
  id: string;
  category: LabMetricCategory;
  dataType: string;
  defaultUnit?: string | null;
  displayName: string;
  methodCode?: string | null;
  methodName?: string | null;
  metricKey: string;
  requiredForScoring: boolean;
  testMethodId?: string | null;
}

export interface TestConditionRecord {
  id: string;
  conditionCode: string;
  conditionName: string;
}

export interface LabResultRecord {
  [key: string]: unknown;
  id: string;
  metricId?: string | null;
  sampleId: string;
}

export interface LabTestingResultsResponse {
  id: string;
  environmentalResults: LabResultRecord[];
  metrics: LabMetric[];
  numericResults: LabResultRecord[];
  observations: LabResultRecord[];
  run: LabTestingQueueRecord;
  samples: SampleRecord[];
  subjectiveRatings: LabResultRecord[];
  testConditions: TestConditionRecord[];
}

export interface SampleResultPayload {
  auditReason?: string;
  metricId: string;
  sampleId: string;
  testConditionId?: string | null;
  testMethodId?: string | null;
  testedAt?: string;
  testedBy?: string;
  unit?: string;
  valueNumeric: number;
}

export interface ObservationPayload {
  auditReason?: string;
  observationText: string;
  observationType?: string;
  observedAt?: string;
  observedBy?: string;
  sampleId: string;
}

export interface SubjectiveRatingPayload {
  auditReason?: string;
  feedbackText?: string | null;
  metricId?: string | null;
  ratedAt?: string;
  ratedBy?: string;
  ratingValue?: number | null;
  sampleId: string;
}

export type RunSummaryStatus = 'not_generated' | 'incomplete' | 'generated' | 'stale' | 'ready_for_scoring';

export interface RunMetricSummaryRecord {
  id: string;
  category: string;
  conditionId?: string | null;
  conditionName?: string | null;
  generatedAt: string;
  maxValue: number;
  meanValue: number;
  metricId: string;
  metricKey: string;
  metricName: string;
  minValue: number;
  nSamples: number;
  sourceTable: string;
  status: string;
  stdDev: number;
  unit?: string | null;
}

export interface MissingRequiredMetricRecord {
  category: string;
  existingResults: number;
  id: string;
  metricKey: string;
  metricName: string;
  requiredSamples: number;
}

export interface RunSummaryDetail {
  canContinueToScoring: boolean;
  id: string;
  missingRequiredMetrics: MissingRequiredMetricRecord[];
  run: {
    id: string;
    formulation: string;
    labTestingStatus: ProductionRunStatus;
    lastGeneratedAt?: string | null;
    latestLabUpdateAt?: string | null;
    runCode: string;
    summaryCount: number;
    targetBenchmark?: string | null;
  };
  status: RunSummaryStatus;
  summaries: RunMetricSummaryRecord[];
}

export type TrafficLight = 'green' | 'yellow' | 'red' | 'gray';

export interface ScoreReportMetric {
  id: string;
  benchmarkTargetMean: number;
  category: string;
  maxAcceptable?: number | null;
  metricName: string;
  metricScore: number;
  minAcceptable?: number | null;
  riskLevel?: string | null;
  riskNote?: string | null;
  runMeanValue: number;
  trafficLight: TrafficLight;
}

export interface ScoreReport {
  id: string;
  algorithmCode: string;
  algorithmVersion: string;
  benchmarkCode: string;
  benchmarkName: string;
  generatedAt: string;
  isBestMatch: boolean;
  keyRisks: string[];
  metrics?: ScoreReportMetric[];
  overallSimilarityScore: number;
  predictabilityIndex: number;
  productionReadinessScore: number;
  recommendations: string[];
  trafficLight: TrafficLight;
}

export interface BenchmarkScoringRunDetail {
  bestMatch: ScoreReport | null;
  id: string;
  reports: ScoreReport[];
  run: {
    id: string;
    formulation: string;
    runCode: string;
    status: ProductionRunStatus;
    targetBenchmark?: string | null;
  };
  scoringReady: boolean;
}

export interface ReportSnapshot {
  schemaVersion?: number;
  benchmarkComparison: Record<string, unknown>[];
  executiveSummary: Record<string, unknown>;
  formulationRecipe: Record<string, unknown>[];
  historicalComparison: Record<string, unknown>[];
  keyRisks: string[];
  labTestResults: Record<string, unknown>[];
  manufacturingParameters: Record<string, unknown>;
  processSetup?: Record<string, unknown>;
  metricBreakdown: Record<string, unknown>[];
  recommendations: string[];
  recommendationsPlaceholder: string;
  scoreReports: Record<string, unknown>[];
  trendAnalysis: Record<string, unknown>[];
}

export interface GeneratedReportRecord {
  [key: string]: unknown;
  id: string;
  bestMatch?: string | null;
  formulation: string;
  generatedAt: string;
  predictabilityIndex?: number | null;
  primaryScoreReportId?: string | null;
  productionRunId: string;
  reportName: string;
  reportSnapshot: ReportSnapshot;
  reportType: string;
  runCode: string;
  status: string;
  trafficLight?: TrafficLight | null;
}

export interface DashboardSummary {
  activeFormulations: number;
  greenCandidates: number;
  redCandidates: number;
  runsAwaitingScoring: number;
  runsAwaitingSummary: number;
  runsReadyForTesting: number;
  scoredRuns: number;
  yellowCandidates: number;
}

export interface DashboardWorkflowStage {
  count: number;
  sortOrder: number;
  stage: string;
}

export interface DashboardLabQueueItem {
  completedResults: number;
  formulation: string;
  id: string;
  missingRequiredMetrics: number;
  requiredResultCount: number;
  runCode: string;
  sampleCount: number;
  status: string;
}

export interface DashboardLatestScore {
  bestMatch: string;
  generatedAt: string;
  lifetimeSimilarity?: number | null;
  predictabilityIndex: number;
  reportId?: string | null;
  runCode: string;
  runId: string;
  scoreReportId: string;
  status: TrafficLight;
  x40Similarity?: number | null;
}

export interface DashboardRiskAlert {
  benchmarkName: string;
  generatedAt: string;
  metricName: string;
  metricScore: number;
  risk: string;
  runCode: string;
  runId: string;
  scoreReportId: string;
  severity?: string | null;
  trafficLight: TrafficLight;
}

export interface DashboardRecentReport {
  generatedAt: string;
  predictabilityIndex?: number | null;
  reportId: string;
  reportName: string;
  runCode: string;
  runId: string;
  status: string;
}

export interface DashboardBenchmarkOverview {
  bestMatchCounts: Array<Record<string, unknown>>;
  latestSimilarity: Array<Record<string, unknown>>;
  topCandidates: Array<Record<string, unknown>>;
  trafficCounts: Array<Record<string, unknown>>;
}

export interface DashboardDataInventoryItem {
  domain: string;
  rowCount: number;
  tableName: string;
}

export interface DashboardSimilarityCandidate {
  candidateName: string;
  confidenceNote?: string | null;
  rank?: number | null;
  weightedDeviationPercent: number;
}

export interface DashboardSimilarityMetric {
  candidateMean?: number | null;
  metricName: string;
  signedDeviationPercent: number;
  sourceDetailLevel: string;
  targetMean: number;
  weight: number;
  weightedDeviationPoints: number;
}

export interface DashboardSimilarityAnalysis {
  analysisCode: string;
  analysisName: string;
  candidateCount: number;
  candidates: DashboardSimilarityCandidate[];
  methodology: string;
  metrics: DashboardSimilarityMetric[];
  notes?: string | null;
  targetName: string;
}

export interface DashboardOverview {
  benchmarkOverview: DashboardBenchmarkOverview;
  dataInventory: DashboardDataInventoryItem[];
  labQueue: DashboardLabQueueItem[];
  latestScores: DashboardLatestScore[];
  recentReports: DashboardRecentReport[];
  riskAlerts: DashboardRiskAlert[];
  summary: DashboardSummary;
  similarityAnalysis: DashboardSimilarityAnalysis | null;
  workflowStatus: DashboardWorkflowStage[];
}

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${env.apiBaseUrl}${endpoint}`, { ...options, headers });
  if (response.status === 401) {
    clearAuthSession();
  }
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => ({ error: response.statusText }))) as Record<string, string>;
    throw new Error(body['error'] ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function downloadDataTransferWorkbook(resource: string, mode: 'export' | 'template'): Promise<void> {
  const headers = new Headers();
  const accessToken = getAccessToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${env.apiBaseUrl}/data-transfer/${encodeURIComponent(resource)}/${mode}`, { headers });
  if (response.status === 401) clearAuthSession();
  if (!response.ok) {
    const body = (await response.json().catch(() => ({ error: response.statusText }))) as Record<string, string>;
    throw new Error(body['error'] ?? `HTTP ${response.status}`);
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const filename = downloadFilename(disposition, `${resource}-${mode}`, 'xlsx');
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function importDataTransferWorkbook(resource: string, file: File, resolutions: DuplicateResolution[] = []): Promise<DataTransferImportResult> {
  return fetchJSON<DataTransferImportResult>(`/data-transfer/${encodeURIComponent(resource)}/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'x-file-name': encodeURIComponent(file.name),
      'x-import-resolutions': JSON.stringify(resolutions),
    },
    body: file,
  });
}

export interface DataTransferValidationRowResult {
  rowIndex: number;
  data: Record<string, unknown>;
  errors: string[];
  action: 'create' | 'update' | 'error';
  existingRecord?: Record<string, unknown>;
}

export interface DuplicateResolution {
  rowIndex: number;
  action: 'overwrite' | 'create-new';
}

export interface DataTransferValidationResponse {
  canImport: boolean;
  resource: string;
  rows: DataTransferValidationRowResult[];
  summary: { create: number; update: number; error: number };
  totalErrors: number;
}

export async function validateDataTransferWorkbook(resource: string, file: File): Promise<DataTransferValidationResponse> {
  return fetchJSON<DataTransferValidationResponse>(`/data-transfer/${encodeURIComponent(resource)}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'x-file-name': encodeURIComponent(file.name),
    },
    body: file,
  });
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

export async function getLibraryRecord(resource: string, id: string): Promise<{ data: LibraryRecord; fields: LibraryFieldDefinition[] }> {
  return fetchJSON<{ data: LibraryRecord; fields: LibraryFieldDefinition[] }>(`/library/${resource}/${encodeURIComponent(id)}`);
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

export async function approveFormulation(id: string, approvedBy: string): Promise<FormulationRecord> {
  return fetchJSON<FormulationRecord>(`/formulations/${id}/approve`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approvedBy }) });
}

export async function archiveFormulation(id: string): Promise<FormulationRecord> {
  return fetchJSON<FormulationRecord>(`/formulations/${id}/archive`, { method: 'PUT' });
}

export async function duplicateFormulation(id: string): Promise<FormulationRecord> {
  return fetchJSON<FormulationRecord>(`/formulations/${id}/duplicate`, { method: 'POST' });
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

export async function previewSetupWorkbook(file: File): Promise<SetupImportPreview> {
  return fetchJSON<SetupImportPreview>('/production-run-imports/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'x-file-name': encodeURIComponent(file.name),
    },
    body: file,
  });
}

export async function commitSetupWorkbook(importId: string, payload: Record<string, unknown>): Promise<{ importId: string; productionRunId: string; idempotent: boolean }> {
  return fetchJSON(`/production-run-imports/${importId}/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function previewMaterialWorkbook(file: File): Promise<MaterialImportPreview> {
  return fetchJSON<MaterialImportPreview>('/material-imports/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'x-file-name': encodeURIComponent(file.name),
    },
    body: file,
  });
}

export async function commitMaterialWorkbook(importId: string, materialResolutions: Record<string, string>): Promise<{ importId: string; summary: Record<string, number>; idempotent: boolean }> {
  return fetchJSON(`/material-imports/${importId}/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ materialResolutions }),
  });
}

export async function getMaterialCatalog(id: string): Promise<MaterialCatalogDetail> {
  return fetchJSON<MaterialCatalogDetail>(`/materials/${id}`);
}

export async function getMaterialPropertyOptions(materialId: string): Promise<MaterialPropertyDefinitionOption[]> {
  return fetchJSON<MaterialPropertyDefinitionOption[]>(`/materials/${materialId}/property-options`);
}

export async function createMaterialPropertyDefinition(input: MaterialPropertyDefinitionInput): Promise<MaterialPropertyDefinitionOption> {
  return fetchJSON<MaterialPropertyDefinitionOption>('/materials/property-definitions', { body: JSON.stringify(input), method: 'POST' });
}

export async function createMaterialProperty(materialId: string, input: MaterialPropertyInput): Promise<MaterialCatalogDetail['properties'][number]> {
  return fetchJSON<MaterialCatalogDetail['properties'][number]>(`/materials/${materialId}/properties`, { body: JSON.stringify(input), method: 'POST' });
}

export async function updateMaterialProperty(materialId: string, propertyFactId: string, input: MaterialPropertyInput): Promise<MaterialCatalogDetail['properties'][number]> {
  return fetchJSON<MaterialCatalogDetail['properties'][number]>(`/materials/${materialId}/properties/${propertyFactId}`, { body: JSON.stringify(input), method: 'PUT' });
}

export async function getProductionRunProcessSetup(runId: string): Promise<ProcessSetupDetail> {
  return fetchJSON<ProcessSetupDetail>(`/production-runs/${runId}/process-setup`);
}

export async function updateProductionRunProcessValues(runId: string, payload: Record<string, unknown>): Promise<ProcessSetupDetail> {
  return fetchJSON<ProcessSetupDetail>(`/production-runs/${runId}/process-values`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function importProductionRunProcessValues(runId: string, sourceRunId: string): Promise<ProcessSetupDetail> {
  return fetchJSON<ProcessSetupDetail>(`/production-runs/${runId}/process-values/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceRunId }),
  });
}

export async function listProcessSetups(): Promise<LibraryRecord[]> {
  return fetchJSON<LibraryRecord[]>('/process-setups');
}

export async function getProcessSetup(id: string): Promise<ProcessSetupDetail> {
  return fetchJSON<ProcessSetupDetail>(`/process-setups/${id}`);
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

export async function listLabTestingQueue(filters: Record<string, string> = {}): Promise<LabTestingQueueRecord[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON<LabTestingQueueRecord[]>(`/lab-testing/queue${suffix}`);
}

export async function getLabTestingRun(runId: string): Promise<LabTestingQueueRecord> {
  return fetchJSON<LabTestingQueueRecord>(`/lab-testing/runs/${runId}`);
}

export async function getLabTestingResults(runId: string): Promise<LabTestingResultsResponse> {
  return fetchJSON<LabTestingResultsResponse>(`/lab-testing/runs/${runId}/results`);
}

export async function startLabTesting(runId: string): Promise<LabTestingQueueRecord> {
  return fetchJSON<LabTestingQueueRecord>(`/lab-testing/runs/${runId}/start`, { method: 'POST' });
}

export async function completeLabTesting(runId: string): Promise<LabTestingQueueRecord> {
  return fetchJSON<LabTestingQueueRecord>(`/lab-testing/runs/${runId}/complete`, { method: 'POST' });
}

export async function saveSampleResult(payload: SampleResultPayload): Promise<LabResultRecord> {
  return fetchJSON<LabResultRecord>('/lab-testing/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function saveEnvironmentalResult(payload: SampleResultPayload): Promise<LabResultRecord> {
  return fetchJSON<LabResultRecord>('/lab-testing/environmental-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function saveSubjectiveRating(payload: SubjectiveRatingPayload): Promise<LabResultRecord> {
  return fetchJSON<LabResultRecord>('/lab-testing/subjective-ratings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function saveObservation(payload: ObservationPayload): Promise<LabResultRecord> {
  return fetchJSON<LabResultRecord>('/lab-testing/observations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getRunSummary(runId: string): Promise<RunSummaryDetail> {
  return fetchJSON<RunSummaryDetail>(`/run-summaries/runs/${runId}`);
}

export async function generateRunSummary(runId: string): Promise<RunSummaryDetail> {
  return fetchJSON<RunSummaryDetail>(`/run-summaries/runs/${runId}/generate`, { method: 'POST' });
}

export async function regenerateRunSummary(runId: string): Promise<RunSummaryDetail> {
  return fetchJSON<RunSummaryDetail>(`/run-summaries/runs/${runId}/regenerate`, { method: 'POST' });
}

export async function getRunSummaryMissingRequiredMetrics(runId: string): Promise<MissingRequiredMetricRecord[]> {
  return fetchJSON<MissingRequiredMetricRecord[]>(`/run-summaries/runs/${runId}/missing-required-metrics`);
}

export async function getBenchmarkScoring(runId: string): Promise<BenchmarkScoringRunDetail> {
  return fetchJSON<BenchmarkScoringRunDetail>(`/benchmark-scoring/runs/${runId}`);
}

export async function generateBenchmarkScoring(runId: string): Promise<BenchmarkScoringRunDetail> {
  return fetchJSON<BenchmarkScoringRunDetail>(`/benchmark-scoring/runs/${runId}/generate`, { method: 'POST' });
}

export async function regenerateBenchmarkScoring(runId: string): Promise<BenchmarkScoringRunDetail> {
  return fetchJSON<BenchmarkScoringRunDetail>(`/benchmark-scoring/runs/${runId}/regenerate`, { method: 'POST' });
}

export async function regenerateBenchmarkGlobally(benchmarkId: string): Promise<GlobalBenchmarkRegenerationResult> {
  return fetchJSON<GlobalBenchmarkRegenerationResult>(`/benchmark-scoring/benchmarks/${benchmarkId}/regenerate-all`, { method: 'POST' });
}

export async function getScoreReport(scoreReportId: string): Promise<ScoreReport> {
  return fetchJSON<ScoreReport>(`/benchmark-scoring/reports/${scoreReportId}`);
}

export async function listReports(filters: Record<string, string> = {}): Promise<GeneratedReportRecord[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON<GeneratedReportRecord[]>(`/reports${suffix}`);
}

export async function getReport(reportId: string): Promise<GeneratedReportRecord> {
  return fetchJSON<GeneratedReportRecord>(`/reports/${reportId}`);
}

export async function getRunReport(runId: string): Promise<GeneratedReportRecord> {
  return fetchJSON<GeneratedReportRecord>(`/reports/runs/${runId}`);
}

export async function generateRunReport(runId: string): Promise<GeneratedReportRecord> {
  return fetchJSON<GeneratedReportRecord>(`/reports/runs/${runId}/generate`, { method: 'POST' });
}

export async function regenerateRunReport(runId: string): Promise<GeneratedReportRecord> {
  return fetchJSON<GeneratedReportRecord>(`/reports/runs/${runId}/regenerate`, { method: 'POST' });
}

export function reportExportUrl(reportId: string, format: 'csv' | 'pdf' | 'xlsx'): string {
  return `${env.apiBaseUrl}/reports/${encodeURIComponent(reportId)}/export/${format}`;
}

export function databaseExportUrl(): string {
  return `${env.apiBaseUrl}/reports/export/database/xlsx`;
}

export async function downloadDatabaseWorkbook(category?: string): Promise<void> {
  const headers = new Headers();
  const accessToken = getAccessToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  const response = await fetch(`${env.apiBaseUrl}/reports/export/database/xlsx${query}`, { headers });
  if (response.status === 401) clearAuthSession();
  if (!response.ok) {
    const body = (await response.json().catch(() => ({ error: response.statusText }))) as Record<string, string>;
    throw new Error(body['error'] ?? `HTTP ${response.status}`);
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const filename = downloadFilename(disposition, 'predictability-index-database', 'xlsx');
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadFilename(contentDisposition: string, name: string, extension: string): string {
  const serverFilename = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1];
  if (serverFilename) return serverFilename;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${name}-${timestamp}.${extension}`;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return fetchJSON<DashboardOverview>('/dashboard');
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return fetchJSON<DashboardSummary>('/dashboard/summary');
}

export async function getDashboardWorkflowStatus(): Promise<DashboardWorkflowStage[]> {
  return fetchJSON<DashboardWorkflowStage[]>('/dashboard/workflow-status');
}

export async function getDashboardLabQueue(): Promise<DashboardLabQueueItem[]> {
  return fetchJSON<DashboardLabQueueItem[]>('/dashboard/lab-queue');
}

export async function getDashboardLatestScores(): Promise<DashboardLatestScore[]> {
  return fetchJSON<DashboardLatestScore[]>('/dashboard/latest-scores');
}

export async function getDashboardRiskAlerts(): Promise<DashboardRiskAlert[]> {
  return fetchJSON<DashboardRiskAlert[]>('/dashboard/risk-alerts');
}

export async function getDashboardRecentReports(): Promise<DashboardRecentReport[]> {
  return fetchJSON<DashboardRecentReport[]>('/dashboard/recent-reports');
}

export async function getDashboardBenchmarkOverview(): Promise<DashboardBenchmarkOverview> {
  return fetchJSON<DashboardBenchmarkOverview>('/dashboard/benchmark-overview');
}

export async function getDashboardDataInventory(): Promise<DashboardDataInventoryItem[]> {
  return fetchJSON<DashboardDataInventoryItem[]>('/dashboard/data-inventory');
}

export async function getDashboardSimilarityAnalysis(): Promise<DashboardSimilarityAnalysis | null> {
  return fetchJSON<DashboardSimilarityAnalysis | null>('/dashboard/similarity-analysis');
}
