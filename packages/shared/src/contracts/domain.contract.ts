import type { Formulation, FormulationStatus } from '../types/domain';
import type {
  BenchmarkMetricTarget,
  BenchmarkProfile,
  DurabilityResult,
  EnvironmentalResult,
  SubjectiveRating,
  TestResult,
} from '../types/domain';
import type { PredictabilitySummary, ScoreResult } from './scoring.contract';

// ── Formulation contracts ─────────────────────────────────────

export interface CreateFormulationDto {
  formulationCode: string;
  name: string;
  description?: string;
  status?: FormulationStatus;
  producedDate?: string;
  lotNumber?: string;
  batchSizeKg?: number;
  notes?: string;
  createdBy?: string;
}

export interface UpdateFormulationDto {
  name?: string;
  description?: string;
  status?: FormulationStatus;
  producedDate?: string;
  lotNumber?: string;
  batchSizeKg?: number;
  notes?: string;
}

export interface FormulationListItem {
  id: string;
  formulationCode: string;
  name: string;
  status: FormulationStatus;
  producedDate?: string;
  lotNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormulationDetailDto extends Formulation {
  materials?: Array<{
    materialId: string;
    materialName: string;
    percentage: number;
    lotNumber?: string;
  }>;
}

// ── Benchmark contracts ───────────────────────────────────────

export interface BenchmarkListItem {
  id: string;
  name: string;
  ballBrand: string;
  ballModel: string;
  isActive: boolean;
  metricCount: number;
}

export interface BenchmarkDetailDto extends BenchmarkProfile {
  metrics: BenchmarkMetricTarget[];
}

export interface BenchmarkWeightValidation {
  valid: boolean;
  totalWeight: number;
  metricCount: number;
  averageWeight: number;
  message: string;
}

// ── Test result contracts ─────────────────────────────────────

export interface UpsertTestResultDto {
  testedAt?: string;
  testedBy?: string;
  weightG?: number;
  diameterMm?: number;
  wallThicknessMm?: number;
  roundnessMm?: number;
  balanceG?: number;
  bounceCm?: number;
  hardnessShorD?: number;
  compressionKg?: number;
  deflectionMm?: number;
  coefficientOfRestitution?: number;
  notes?: string;
}

export interface UpsertDurabilityDto {
  testedAt?: string;
  testedBy?: string;
  airCannonCycles?: number;
  crackInitiationCycles?: number;
  crackPropagationMm?: number;
  deformationMm?: number;
  notes?: string;
}

export interface UpsertEnvironmentalDto {
  testedAt?: string;
  testedBy?: string;
  hotPerformanceScore?: number;
  coldPerformanceScore?: number;
  humidityPerformanceScore?: number;
  testTempHotC?: number;
  testTempColdC?: number;
  testHumidityPct?: number;
  notes?: string;
}

export interface UpsertSubjectiveRatingDto {
  ratedAt?: string;
  ratedBy?: string;
  feelScore?: number;
  soundScore?: number;
  perceivedSpeedScore?: number;
  perceivedDurabilityScore?: number;
  notes?: string;
}

export interface FormulationResultsBundle {
  physical: TestResult | null;
  durability: DurabilityResult | null;
  environmental: EnvironmentalResult | null;
  subjective: SubjectiveRating | null;
}

export interface GeneratedReportDto {
  formulationId: string;
  formulationCode: string;
  formulationName: string;
  generatedAt: string;
  executiveSummary: {
    verdict: string;
    predictabilityScore: number;
    scoreBand: string;
    lifetimeSimilarity: number | null;
    franklinX40Similarity: number | null;
    durabilityPassProbability: number;
    bounceComplianceProbability: number | null;
    hardnessComplianceProbability: number | null;
    overallProductionReadiness: number;
    trafficLight: string;
    productionReady: boolean;
    topRisks: string[];
  };
  predictabilitySummary: PredictabilitySummary;
  formulation: FormulationDetailDto;
  benchmarkResults: Array<{
    benchmark: { id: string; name: string; ballBrand: string; ballModel: string };
    scoreResult: ScoreResult;
  }>;
  testData: FormulationResultsBundle;
  recommendations: string[];
}
