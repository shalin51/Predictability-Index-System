export type TrafficLight = 'green' | 'yellow' | 'red' | 'gray';

export interface BenchmarkScoringRecord {
  [key: string]: unknown;
  id: string;
}

export interface AlgorithmConfig {
  completionWeight: number;
  readinessWeight: number;
  similarityWeight: number;
  trafficLightThresholds: {
    green: number;
    red: number;
    yellow: number;
  };
}

export interface ScoringMetricInput {
  benchmarkName: string;
  criticality?: string | null;
  maxAcceptable: number | null;
  metricId: string;
  metricName: string;
  minAcceptable: number | null;
  requiredForPass: boolean;
  runMeanValue: number | null;
  runSummaryId?: string | null;
  targetMean: number | null;
  weight: number;
}

export interface MetricScoreResult {
  criticality?: string | null;
  distance: number | null;
  maxAcceptable: number | null;
  metricId: string;
  metricName: string;
  metricScore: number;
  minAcceptable: number | null;
  normalizedDistance: number | null;
  riskLevel?: string | null;
  riskNote?: string | null;
  runMeanValue: number | null;
  runSummaryId?: string | null;
  targetMean: number | null;
  trafficLight: TrafficLight;
  weightedContribution: number;
  weight: number;
}

export interface BenchmarkScoreResult {
  benchmarkCode: string;
  benchmarkId: string;
  benchmarkName: string;
  keyRisks: string[];
  metrics: MetricScoreResult[];
  overallSimilarityScore: number;
  predictabilityIndex: number;
  productionReadinessScore: number;
  recommendations: string[];
  requiredMetricCompletionScore: number;
  trafficLight: TrafficLight;
}
