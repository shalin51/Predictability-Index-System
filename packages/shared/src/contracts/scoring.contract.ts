// ── Scoring contracts — exported from @amfpi/shared ──────────

export type TrafficLight = 'green' | 'yellow' | 'red';
export type PredictabilityBand =
  | 'extremely_likely'
  | 'strong_candidate'
  | 'needs_refinement'
  | 'unlikely';

export interface MetricScore {
  metricName: string;
  metricCategory: string;
  rawValue: number | null;
  targetValue: number;
  minAcceptable: number | null;
  maxAcceptable: number | null;
  standardDeviation: number | null;
  weight: number;
  criticality: string;
  unit: string | null;
  normalizedDistance: number;  // 0 = perfect, 1 = at std-dev boundary, >1 = outside range
  withinRange: boolean;
  trafficLight: TrafficLight;
  score: number;               // weighted contribution 0–100
  isMissing: boolean;
}

export interface BenchmarkSimilarity {
  benchmarkId: string;
  benchmarkName: string;
  similarity: number;          // 0–100 %
  trafficLight: TrafficLight;
  criticalFailures: string[];  // metric names with criticality=critical and red status
  missingMetrics: string[];
}

export interface ScoreResult {
  formulationId: string;
  benchmarkId: string;
  overallScore: number;          // 0–100 Predictability Index
  similarity: number;            // 0–100 %
  scoreBand: PredictabilityBand;
  trafficLight: TrafficLight;
  productionReady: boolean;
  durabilityPassProbability: number;
  bounceComplianceProbability: number | null;
  hardnessComplianceProbability: number | null;
  overallProductionReadiness: number;
  metricScores: MetricScore[];
  benchmarkSimilarity: BenchmarkSimilarity;
  keyRisks: string[];
  scoredAt: string;
}

export interface PredictabilitySummary {
  formulationId: string;
  overallPredictabilityScore: number;
  scoreBand: PredictabilityBand;
  lifetimeSimilarity: number | null;
  franklinX40Similarity: number | null;
  durabilityPassProbability: number;
  bounceComplianceProbability: number | null;
  hardnessComplianceProbability: number | null;
  overallProductionReadiness: number;
  trafficLight: TrafficLight;
  productionReady: boolean;
  recommendedBenchmarkId: string | null;
  recommendedBenchmarkName: string | null;
  keyRisks: string[];
  benchmarkScores: ScoreResult[];
  scoredAt: string;
}

export interface ScoreRequestDto {
  formulationId: string;
  benchmarkId: string;
}
