import type {
  AlgorithmConfig,
  BenchmarkScoreResult,
  MetricScoreResult,
  ScoringMetricInput,
  TrafficLight,
} from '../benchmarkScoring.types';

const defaultConfig: AlgorithmConfig = {
  completionWeight: 0.15,
  readinessWeight: 0.25,
  similarityWeight: 0.6,
  trafficLightThresholds: {
    green: 85,
    red: 0,
    yellow: 70,
  },
};

export class PerformanceDistanceService {
  scoreBenchmark(
    benchmark: { benchmarkCode: string; benchmarkId: string; benchmarkName: string },
    inputs: ScoringMetricInput[],
    configInput: unknown
  ): BenchmarkScoreResult {
    const config = normalizeConfig(configInput);
    const metrics = inputs.map((input) => this.scoreMetric(input, config));
    const weightSum = metrics.reduce((sum, metric) => sum + metric.weight, 0);
    const contributionSum = metrics.reduce((sum, metric) => sum + metric.weightedContribution, 0);
    const overallSimilarityScore = weightSum > 0 ? contributionSum / weightSum : 0;
    const requiredMetrics = inputs.filter((input) => input.requiredForPass);
    const completedRequired = requiredMetrics.filter((input) => input.runMeanValue != null).length;
    const requiredMetricCompletionScore = requiredMetrics.length > 0 ? (completedRequired / requiredMetrics.length) * 100 : 100;
    const productionReadinessScore = this.readinessScore(metrics);
    const predictabilityIndex = (
      overallSimilarityScore * config.similarityWeight
      + productionReadinessScore * config.readinessWeight
      + requiredMetricCompletionScore * config.completionWeight
    );
    const keyRisks = metrics
      .filter((metric) => metric.riskNote)
      .sort((a, b) => riskRank(b.riskLevel) - riskRank(a.riskLevel))
      .slice(0, 6)
      .map((metric) => metric.riskNote ?? '');

    return {
      benchmarkCode: benchmark.benchmarkCode,
      benchmarkId: benchmark.benchmarkId,
      benchmarkName: benchmark.benchmarkName,
      keyRisks,
      metrics,
      overallSimilarityScore: round(overallSimilarityScore),
      predictabilityIndex: round(predictabilityIndex),
      productionReadinessScore: round(productionReadinessScore),
      recommendations: ['Recommendations will be generated in the reporting workflow.'],
      requiredMetricCompletionScore: round(requiredMetricCompletionScore),
      trafficLight: this.trafficLight(predictabilityIndex, config),
    };
  }

  private scoreMetric(input: ScoringMetricInput, config: AlgorithmConfig): MetricScoreResult {
    if (input.runMeanValue == null || input.targetMean == null || input.maxAcceptable == null || input.minAcceptable == null) {
      return {
        criticality: input.criticality,
        distance: null,
        maxAcceptable: input.maxAcceptable,
        metricId: input.metricId,
        metricName: input.metricName,
        metricScore: 0,
        minAcceptable: input.minAcceptable,
        normalizedDistance: null,
        riskLevel: input.requiredForPass ? 'blocking' : null,
        riskNote: input.requiredForPass ? `${input.metricName} is missing required summary data` : null,
        runMeanValue: input.runMeanValue,
        runSummaryId: input.runSummaryId,
        targetMean: input.targetMean,
        trafficLight: 'gray',
        weightedContribution: 0,
        weight: input.weight,
      };
    }

    const rangeWidth = Math.max(0.00001, input.maxAcceptable - input.minAcceptable);
    const distance = Math.abs(input.runMeanValue - input.targetMean);
    const normalizedDistance = distance / rangeWidth;
    const metricScore = Math.max(0, 100 - normalizedDistance * 100);
    const trafficLight = this.trafficLight(metricScore, config);
    const { riskLevel, riskNote } = this.risk(input, metricScore);

    return {
      criticality: input.criticality,
      distance: round(distance),
      maxAcceptable: input.maxAcceptable,
      metricId: input.metricId,
      metricName: input.metricName,
      metricScore: round(metricScore),
      minAcceptable: input.minAcceptable,
      normalizedDistance: round(normalizedDistance),
      riskLevel,
      riskNote,
      runMeanValue: input.runMeanValue,
      runSummaryId: input.runSummaryId,
      targetMean: input.targetMean,
      trafficLight,
      weightedContribution: round(metricScore * input.weight),
      weight: input.weight,
    };
  }

  private readinessScore(metrics: MetricScoreResult[]): number {
    if (metrics.length === 0) return 0;
    const ready = metrics.filter((metric) => metric.trafficLight === 'green').length;
    const warning = metrics.filter((metric) => metric.trafficLight === 'yellow').length;
    return ((ready + warning * 0.65) / metrics.length) * 100;
  }

  private risk(input: ScoringMetricInput, metricScore: number): { riskLevel?: string | null; riskNote?: string | null } {
    if (input.runMeanValue == null) return {};
    if (input.requiredForPass && (input.runMeanValue < (input.minAcceptable ?? -Infinity) || input.runMeanValue > (input.maxAcceptable ?? Infinity))) {
      return { riskLevel: 'critical', riskNote: `${input.metricName} is outside ${input.benchmarkName} acceptable range` };
    }
    if (metricScore < 60) return { riskLevel: 'high', riskNote: `${input.metricName} score is below 60` };
    const lowerWidth = Math.abs(input.runMeanValue - (input.minAcceptable ?? input.runMeanValue));
    const upperWidth = Math.abs((input.maxAcceptable ?? input.runMeanValue) - input.runMeanValue);
    const rangeWidth = Math.max(0.00001, (input.maxAcceptable ?? 0) - (input.minAcceptable ?? 0));
    if (Math.min(lowerWidth, upperWidth) / rangeWidth <= 0.1) {
      return { riskLevel: 'warning', riskNote: `${input.metricName} is near an acceptable range boundary` };
    }
    return {};
  }

  private trafficLight(score: number, config: AlgorithmConfig): TrafficLight {
    if (!Number.isFinite(score)) return 'gray';
    if (score >= config.trafficLightThresholds.green) return 'green';
    if (score >= config.trafficLightThresholds.yellow) return 'yellow';
    return 'red';
  }
}

function normalizeConfig(input: unknown): AlgorithmConfig {
  if (!input || typeof input !== 'object') return defaultConfig;
  const config = input as Partial<AlgorithmConfig>;
  return {
    completionWeight: Number(config.completionWeight ?? defaultConfig.completionWeight),
    readinessWeight: Number(config.readinessWeight ?? defaultConfig.readinessWeight),
    similarityWeight: Number(config.similarityWeight ?? defaultConfig.similarityWeight),
    trafficLightThresholds: {
      green: Number(config.trafficLightThresholds?.green ?? defaultConfig.trafficLightThresholds.green),
      red: Number(config.trafficLightThresholds?.red ?? defaultConfig.trafficLightThresholds.red),
      yellow: Number(config.trafficLightThresholds?.yellow ?? defaultConfig.trafficLightThresholds.yellow),
    },
  };
}

function riskRank(level?: string | null): number {
  if (level === 'blocking') return 4;
  if (level === 'critical') return 3;
  if (level === 'high') return 2;
  if (level === 'warning') return 1;
  return 0;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
