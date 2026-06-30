import type {
  MetricScore,
  PredictabilityBand,
  PredictabilitySummary,
  ScoreResult,
  TrafficLight,
} from '@amfpi/shared';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function weightedAverage(values: Array<{ value: number | null; weight: number }>): number {
  const valid = values.filter((entry) => entry.value != null);
  const totalWeight = valid.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return 0;
  return valid.reduce((sum, entry) => sum + (entry.value ?? 0) * entry.weight, 0) / totalWeight;
}

export function getPredictabilityBand(score: number): PredictabilityBand {
  if (score >= 90) return 'extremely_likely';
  if (score >= 75) return 'strong_candidate';
  if (score >= 60) return 'needs_refinement';
  return 'unlikely';
}

function metricPassProbability(metric: MetricScore): number {
  if (metric.isMissing) return 10;

  let probability = metric.withinRange
    ? 100 - Math.min(metric.normalizedDistance, 1) * 15
    : 85 - Math.max(metric.normalizedDistance - 1, 0) * 35;

  if (!metric.withinRange && metric.criticality === 'critical') {
    probability -= 10;
  }

  return round1(clamp(probability, 0, 100));
}

function probabilityForMetric(metricScores: MetricScore[], metricName: string): number | null {
  const metric = metricScores.find((score) => score.metricName === metricName);
  return metric ? metricPassProbability(metric) : null;
}

function probabilityForCategory(metricScores: MetricScore[], category: string): number {
  const relevant = metricScores.filter((score) => score.metricCategory === category);
  if (relevant.length === 0) return 0;

  return round1(weightedAverage(
    relevant.map((metric) => ({
      value: metricPassProbability(metric),
      weight: metric.weight,
    }))
  ));
}

export function composeProductionReadiness(
  overallScore: number,
  durabilityPassProbability: number,
  bounceComplianceProbability: number | null,
  hardnessComplianceProbability: number | null
): number {
  return round1(weightedAverage([
    { value: overallScore, weight: 0.5 },
    { value: durabilityPassProbability, weight: 0.2 },
    { value: bounceComplianceProbability, weight: 0.15 },
    { value: hardnessComplianceProbability, weight: 0.15 },
  ]));
}

export function deriveSupplementalScores(metricScores: MetricScore[]): {
  durabilityPassProbability: number;
  bounceComplianceProbability: number | null;
  hardnessComplianceProbability: number | null;
} {
  const durabilityPassProbability = probabilityForCategory(metricScores, 'durability');
  const bounceComplianceProbability = probabilityForMetric(metricScores, 'bounce');
  const hardnessComplianceProbability = probabilityForMetric(metricScores, 'hardness');

  return {
    durabilityPassProbability,
    bounceComplianceProbability,
    hardnessComplianceProbability,
  };
}

function aggregateProbability(
  scores: ScoreResult[],
  selector: (score: ScoreResult) => number | null
): number | null {
  const values = scores
    .map(selector)
    .filter((value): value is number => value != null);

  if (values.length === 0) return null;
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function collectTrafficLight(scores: ScoreResult[]): TrafficLight {
  if (scores.some((score) => score.trafficLight === 'red')) return 'red';
  if (scores.some((score) => score.trafficLight === 'yellow')) return 'yellow';
  return 'green';
}

export function buildPredictabilitySummary(
  formulationId: string,
  benchmarkScores: ScoreResult[]
): PredictabilitySummary {
  const rankedScores = benchmarkScores.slice().sort((left, right) => right.overallScore - left.overallScore);
  const bestScore = rankedScores[0] ?? null;

  const lifetimeSimilarity = rankedScores.find((score) =>
    /lifetime/i.test(score.benchmarkSimilarity.benchmarkName)
  )?.similarity ?? null;

  const franklinX40Similarity = rankedScores.find((score) =>
    /franklin\s*x-?40/i.test(score.benchmarkSimilarity.benchmarkName)
  )?.similarity ?? null;

  const durabilityPassProbability = aggregateProbability(
    rankedScores,
    (score) => score.durabilityPassProbability
  ) ?? 0;

  const bounceComplianceProbability = aggregateProbability(
    rankedScores,
    (score) => score.bounceComplianceProbability
  );

  const hardnessComplianceProbability = aggregateProbability(
    rankedScores,
    (score) => score.hardnessComplianceProbability
  );

  const overallPredictabilityScore = bestScore?.overallScore ?? 0;
  const overallProductionReadiness = composeProductionReadiness(
    overallPredictabilityScore,
    durabilityPassProbability,
    bounceComplianceProbability,
    hardnessComplianceProbability
  );

  return {
    formulationId,
    overallPredictabilityScore,
    scoreBand: getPredictabilityBand(overallPredictabilityScore),
    lifetimeSimilarity,
    franklinX40Similarity,
    durabilityPassProbability,
    bounceComplianceProbability,
    hardnessComplianceProbability,
    overallProductionReadiness,
    trafficLight: bestScore?.trafficLight ?? collectTrafficLight(rankedScores),
    productionReady: bestScore?.productionReady ?? false,
    recommendedBenchmarkId: bestScore?.benchmarkId ?? null,
    recommendedBenchmarkName: bestScore?.benchmarkSimilarity.benchmarkName ?? null,
    keyRisks: [...new Set(rankedScores.flatMap((score) => score.keyRisks))],
    benchmarkScores: rankedScores,
    scoredAt: bestScore?.scoredAt ?? new Date().toISOString(),
  };
}
