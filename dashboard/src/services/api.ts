/**
 * api.ts — Dashboard API service layer.
 * Types come from @amfpi/shared — never defined locally here.
 */
import type {
  BenchmarkDetailDto,
  BenchmarkListItem,
  BenchmarkMetricTarget,
  BenchmarkWeightValidation,
  BallTestingImportRequestDto,
  BallTestingImportResultDto,
  CreateFormulationDto,
  DbHealthResponse,
  DurabilityResult,
  EnvironmentalResult,
  FormulationDetailDto,
  FormulationListItem,
  FormulationResultsBundle,
  FormulationStatus,
  GeneratedReportDto,
  HealthResponse,
  PaginatedResponse,
  PredictabilitySummary,
  ScoreResult,
  SubjectiveRating,
  TestResult,
  UpsertDurabilityDto,
  UpsertEnvironmentalDto,
  UpsertSubjectiveRatingDto,
  UpsertTestResultDto,
  TrafficLight,
  UpdateFormulationDto,
} from '@amfpi/shared';
import { env } from '../config/env';

export type {
  BenchmarkListItem as BenchmarkItem,
  BenchmarkDetailDto,
  BenchmarkMetricTarget,
  BenchmarkWeightValidation,
  BallTestingImportRequestDto,
  BallTestingImportResultDto,
  CreateFormulationDto,
  DurabilityResult,
  EnvironmentalResult,
  FormulationDetailDto as FormulationDetail,
  FormulationListItem,
  FormulationResultsBundle,
  FormulationStatus,
  GeneratedReportDto,
  PredictabilitySummary,
  ScoreResult,
  SubjectiveRating,
  TestResult,
  TrafficLight,
  UpsertDurabilityDto,
  UpsertEnvironmentalDto,
  UpsertSubjectiveRatingDto,
  UpsertTestResultDto,
  UpdateFormulationDto,
};

export type PaginatedFormulations = PaginatedResponse<FormulationListItem>;

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

export async function listFormulations(page = 1, pageSize = 20): Promise<PaginatedFormulations> {
  return fetchJSON<PaginatedFormulations>(`/formulations?page=${page}&pageSize=${pageSize}`);
}

export async function getFormulation(id: string): Promise<FormulationDetailDto> {
  return fetchJSON<FormulationDetailDto>(`/formulations/${id}`);
}

export async function createFormulation(payload: CreateFormulationDto): Promise<FormulationDetailDto> {
  return fetchJSON<FormulationDetailDto>('/formulations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateFormulation(
  id: string,
  payload: UpdateFormulationDto
): Promise<FormulationDetailDto> {
  return fetchJSON<FormulationDetailDto>(`/formulations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function listBenchmarks(): Promise<BenchmarkListItem[]> {
  return fetchJSON<BenchmarkListItem[]>('/benchmarks');
}

export async function getBenchmark(id: string): Promise<BenchmarkDetailDto> {
  return fetchJSON<BenchmarkDetailDto>(`/benchmarks/${id}`);
}

export async function getBenchmarkMetrics(id: string): Promise<BenchmarkMetricTarget[]> {
  return fetchJSON<BenchmarkMetricTarget[]>(`/benchmarks/${id}/metrics`);
}

export async function updateBenchmarkMetric(
  benchmarkId: string,
  metricName: string,
  payload: Partial<BenchmarkMetricTarget>
): Promise<BenchmarkMetricTarget> {
  return fetchJSON<BenchmarkMetricTarget>(`/benchmarks/${benchmarkId}/metrics/${metricName}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function validateBenchmarkWeights(benchmarkId: string): Promise<BenchmarkWeightValidation> {
  return fetchJSON<BenchmarkWeightValidation>(`/benchmarks/${benchmarkId}/metrics/validate-weights`);
}

export async function getFormulationResults(formulationId: string): Promise<FormulationResultsBundle> {
  return fetchJSON<FormulationResultsBundle>(`/formulations/${formulationId}/results`);
}

export async function savePhysicalResults(
  formulationId: string,
  payload: UpsertTestResultDto
): Promise<FormulationResultsBundle['physical']> {
  return fetchJSON<FormulationResultsBundle['physical']>(`/formulations/${formulationId}/results/physical`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function saveDurabilityResults(
  formulationId: string,
  payload: UpsertDurabilityDto
): Promise<FormulationResultsBundle['durability']> {
  return fetchJSON<FormulationResultsBundle['durability']>(`/formulations/${formulationId}/results/durability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function saveEnvironmentalResults(
  formulationId: string,
  payload: UpsertEnvironmentalDto
): Promise<FormulationResultsBundle['environmental']> {
  return fetchJSON<FormulationResultsBundle['environmental']>(`/formulations/${formulationId}/results/environmental`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function saveSubjectiveResults(
  formulationId: string,
  payload: UpsertSubjectiveRatingDto
): Promise<FormulationResultsBundle['subjective']> {
  return fetchJSON<FormulationResultsBundle['subjective']>(`/formulations/${formulationId}/results/subjective`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function scoreFormulation(
  formulationId: string,
  benchmarkId: string
): Promise<ScoreResult> {
  return fetchJSON<ScoreResult>(`/formulations/${formulationId}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ benchmarkId }),
  });
}

export async function scoreAllBenchmarks(formulationId: string): Promise<ScoreResult[]> {
  return fetchJSON<ScoreResult[]>(`/formulations/${formulationId}/score/all`);
}

export async function getPredictabilitySummary(formulationId: string): Promise<PredictabilitySummary> {
  return fetchJSON<PredictabilitySummary>(`/formulations/${formulationId}/score/summary`);
}

export async function getReport(formulationId: string): Promise<GeneratedReportDto> {
  return fetchJSON<GeneratedReportDto>(`/formulations/${formulationId}/report`);
}

export async function importBallTestingWorkbook(
  payload: BallTestingImportRequestDto
): Promise<BallTestingImportResultDto> {
  return fetchJSON<BallTestingImportResultDto>('/imports/ball-testing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
