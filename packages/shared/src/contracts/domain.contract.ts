import type { Formulation, ManufacturingData } from '../types/domain';
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
  producedDate?: string;
  resinComponents: Array<{
    resinComponent: string;
    percentComposition: number;
    materialSupplier: string;
    lotNumber?: string;
  }>;
  manufacturingData?: ManufacturingData;
  createdBy?: string;
}

export interface UpdateFormulationDto {
  producedDate?: string;
  resinComponents?: CreateFormulationDto['resinComponents'];
  manufacturingData?: ManufacturingData;
}

export interface FormulationListItem {
  id: string;
  formulationCode: string;
  producedDate?: string;
}

export type FormulationDetailDto = Formulation;

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
  stretchQuarterInchLbf?: number;
  fullStretchMaxLbf?: number;
  deflectionMm?: number;
  coefficientOfRestitution?: number;
  notes?: string;
}

export interface UpsertDurabilityDto {
  testedAt?: string;
  testedBy?: string;
  airCannonCycles?: number;
  crackInitiationCycles?: number;
  crackPropagationObservations?: number;
  deformationMm?: number;
}

export interface UpsertEnvironmentalDto {
  testedAt?: string;
  testedBy?: string;
  hotTemperaturePerformance?: number;
  coldTemperaturePerformance?: number;
  humidityExposureResults?: number;
}

export interface UpsertSubjectiveRatingDto {
  ratedAt?: string;
  ratedBy?: string;
  playerFeedback?: string;
  feelScore?: number;
  soundScore?: number;
  perceivedSpeedScore?: number;
  perceivedDurabilityScore?: number;
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
