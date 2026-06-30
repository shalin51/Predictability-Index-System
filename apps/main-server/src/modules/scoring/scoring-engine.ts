/**
 * scoring-engine.ts
 *
 * Performance Distance Score — V1 deterministic scoring algorithm.
 *
 * Algorithm:
 *   For each metric in the benchmark profile:
 *     1. Get the actual measured value from the formulation's test results.
 *     2. Compute the normalised distance from the target:
 *          distance = |actual - target| / (stdDev || toleranceBand || 1)
 *     3. Map distance to a 0–100 raw metric score:
 *          score = max(0, 100 - distance * 100)
 *     4. Apply criticality multiplier for out-of-range critical metrics.
 *     5. Weighted average of all metric scores = overall Predictability Index.
 *
 * Traffic light:
 *   green  — score ≥ 80 and no critical failures
 *   yellow — score 50–79 or at least one high/critical metric yellow
 *   red    — score < 50 or at least one critical metric red
 *
 * The same inputs ALWAYS produce the same output (pure function).
 */

import type {
  BenchmarkMetricTarget,
  TestResult,
  DurabilityResult,
  EnvironmentalResult,
  SubjectiveRating,
  MetricScore,
  ScoreResult,
  BenchmarkSimilarity,
  TrafficLight,
} from '@amfpi/shared';
import {
  composeProductionReadiness,
  deriveSupplementalScores,
  getPredictabilityBand,
} from './scoring-summary';

// ─── Types ───────────────────────────────────────────────────

interface AllTestData {
  physical?: TestResult | null;
  durability?: DurabilityResult | null;
  environmental?: EnvironmentalResult | null;
  subjective?: SubjectiveRating | null;
}

interface BenchmarkInput {
  id: string;
  name: string;
  metrics: BenchmarkMetricTarget[];
}

// ─── Metric → value extractor map ───────────────────────────

const METRIC_FIELD_MAP: Record<string, (d: AllTestData) => number | null | undefined> = {
  // Physical / Performance (from TestResult)
  weight:                      (d) => d.physical?.weightG,
  diameter:                    (d) => d.physical?.diameterMm,
  wall_thickness:              (d) => d.physical?.wallThicknessMm,
  roundness:                   (d) => d.physical?.roundnessMm,
  balance:                     (d) => d.physical?.balanceG,
  bounce:                      (d) => d.physical?.bounceCm,
  hardness:                    (d) => d.physical?.hardnessShorD,
  compression:                 (d) => d.physical?.compressionKg,
  deflection:                  (d) => d.physical?.deflectionMm,
  coefficient_of_restitution:  (d) => d.physical?.coefficientOfRestitution,
  // Durability
  air_cannon_cycles:           (d) => d.durability?.airCannonCycles,
  crack_initiation_cycles:     (d) => d.durability?.crackInitiationCycles,
  crack_propagation:           (d) => d.durability?.crackPropagationMm,
  deformation:                 (d) => d.durability?.deformationMm,
  // Environmental
  hot_performance:             (d) => d.environmental?.hotPerformanceScore,
  cold_performance:            (d) => d.environmental?.coldPerformanceScore,
  humidity_performance:        (d) => d.environmental?.humidityPerformanceScore,
  // Subjective
  feel:                        (d) => d.subjective?.feelScore,
  sound:                       (d) => d.subjective?.soundScore,
  perceived_speed:             (d) => d.subjective?.perceivedSpeedScore,
  perceived_durability:        (d) => d.subjective?.perceivedDurabilityScore,
};

// ─── Traffic light thresholds ────────────────────────────────

function trafficLight(_normalizedDistance: number, withinRange: boolean, criticality: string): TrafficLight {
  if (criticality === 'critical') {
    return withinRange ? 'green' : 'red';
  }
  if (withinRange) return 'green';   // within acceptable band → green
  return _normalizedDistance > 2.0 ? 'red' : 'yellow'; // outside range
}

// ─── Overall traffic light from metric lights ────────────────

function overallTrafficLight(metricScores: MetricScore[], hasCriticalRed: boolean): TrafficLight {
  if (hasCriticalRed) return 'red';
  if (metricScores.some((m) => m.trafficLight === 'red')) return 'red';
  if (metricScores.some((m) => m.trafficLight === 'yellow')) return 'yellow';
  return 'green';
}

// ─── Core scoring function (pure, deterministic) ─────────────

function scoreMetric(
  metric: BenchmarkMetricTarget,
  actualValue: number | null | undefined
): MetricScore {
  const isMissing = actualValue == null;
  const raw = actualValue ?? null;

  if (isMissing) {
    // Missing metrics count as worst case — heavy penalty
    return {
      metricName: metric.metricName,
      metricCategory: metric.metricCategory,
      rawValue: null,
      targetValue: metric.targetValue,
      minAcceptable: metric.minAcceptable ?? null,
      maxAcceptable: metric.maxAcceptable ?? null,
      standardDeviation: metric.standardDeviation ?? null,
      weight: metric.weight,
      criticality: metric.criticality,
      unit: metric.unit ?? null,
      normalizedDistance: 2.0,    // penalty for missing
      withinRange: false,
      trafficLight: metric.criticality === 'critical' ? 'red' : 'yellow',
      score: 100 / (1 + 2.0) * 0.3,  // heavy penalty: ~10
      isMissing: true,
    };
  }

  const actual = raw as number; // raw is not null here (checked above via isMissing)

  // Normalisation divisor
  const stdDev = metric.standardDeviation ?? 0;
  const range = (metric.maxAcceptable != null && metric.minAcceptable != null)
    ? (metric.maxAcceptable - metric.minAcceptable) / 2
    : null;
  const divisor = stdDev > 0 ? stdDev : (range != null && range > 0 ? range : Math.abs(metric.targetValue) * 0.1 || 1);

  const rawDistance = Math.abs(actual - metric.targetValue);
  const normalizedDist = rawDistance / divisor;

  // Within acceptable range?
  const withinRange =
    metric.minAcceptable != null && metric.maxAcceptable != null
      ? actual >= metric.minAcceptable && actual <= metric.maxAcceptable
      : normalizedDist <= 1.0;

  const light = trafficLight(normalizedDist, withinRange, metric.criticality);

  // Score: strictly decreasing as distance increases
  // 100/(1+dist) ensures: dist=0→100, dist=1→50, dist=2→33, never 0 except when forced
  let rawScore = 100 / (1 + normalizedDist);
  if (!withinRange && metric.criticality === 'critical') rawScore = rawScore * 0.5;

  return {
    metricName: metric.metricName,
    metricCategory: metric.metricCategory,
    rawValue: actual,
    targetValue: metric.targetValue,
    minAcceptable: metric.minAcceptable ?? null,
    maxAcceptable: metric.maxAcceptable ?? null,
    standardDeviation: metric.standardDeviation ?? null,
    weight: metric.weight,
    criticality: metric.criticality,
    unit: metric.unit ?? null,
    normalizedDistance: normalizedDist,
    withinRange,
    trafficLight: light,
    score: rawScore,
    isMissing: false,
  };
}

// ─── Public scoring function ──────────────────────────────────

export function computeScore(
  formulationId: string,
  benchmark: BenchmarkInput,
  testData: AllTestData
): ScoreResult {
  const metricScores = benchmark.metrics.map((m) => {
    const extractor = METRIC_FIELD_MAP[m.metricName];
    const value = extractor ? extractor(testData) : undefined;
    return scoreMetric(m, value);
  });

  // Weighted average
  const totalWeight = metricScores.reduce((s, m) => s + m.weight, 0);
  const weightedScore = totalWeight > 0
    ? metricScores.reduce((s, m) => s + m.score * m.weight, 0) / totalWeight
    : 0;

  const overallScore = Math.round(weightedScore * 10) / 10;
  const similarity = Math.round(weightedScore * 10) / 10; // in V1 same as score
  const scoreBand = getPredictabilityBand(overallScore);

  const criticalRed = metricScores.filter(
    (m) => m.criticality === 'critical' && m.trafficLight === 'red'
  );
  const hasCriticalRed = criticalRed.length > 0;

  const light = overallTrafficLight(metricScores, hasCriticalRed);
  const productionReady = light === 'green';

  const missingMetrics = metricScores.filter((m) => m.isMissing).map((m) => m.metricName);
  const keyRisks: string[] = [
    ...criticalRed.map((m) => `Critical metric out of range: ${m.metricName}`),
    ...metricScores
      .filter((m) => m.trafficLight === 'red' && m.criticality !== 'critical')
      .map((m) => `${m.metricName} is outside acceptable range`),
    ...(missingMetrics.length > 0 ? [`Missing test data: ${missingMetrics.join(', ')}`] : []),
  ];

  const benchmarkSimilarity: BenchmarkSimilarity = {
    benchmarkId: benchmark.id,
    benchmarkName: benchmark.name,
    similarity,
    trafficLight: light,
    criticalFailures: criticalRed.map((m) => m.metricName),
    missingMetrics,
  };

  const supplemental = deriveSupplementalScores(metricScores);
  const overallProductionReadiness = composeProductionReadiness(
    overallScore,
    supplemental.durabilityPassProbability,
    supplemental.bounceComplianceProbability,
    supplemental.hardnessComplianceProbability
  );

  return {
    formulationId,
    benchmarkId: benchmark.id,
    overallScore,
    similarity,
    scoreBand,
    trafficLight: light,
    productionReady,
    durabilityPassProbability: supplemental.durabilityPassProbability,
    bounceComplianceProbability: supplemental.bounceComplianceProbability,
    hardnessComplianceProbability: supplemental.hardnessComplianceProbability,
    overallProductionReadiness,
    metricScores,
    benchmarkSimilarity,
    keyRisks,
    scoredAt: new Date().toISOString(),
  };
}

