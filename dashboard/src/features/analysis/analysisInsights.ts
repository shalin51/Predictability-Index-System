import type {
  FormulationListItem,
  FormulationResultsBundle,
  ScoreResult,
  TrafficLight,
} from '../../services/api';

export interface HistoricalAnalysisRow {
  formulation: FormulationListItem;
  scores: ScoreResult[];
  bestScore: ScoreResult | null;
}

export interface SimilaritySummary {
  benchmarkId: string;
  benchmarkName: string;
  label: string;
  overallScore: number;
  similarity: number;
  trafficLight: TrafficLight;
}

export interface SimilarityMapPoint {
  bestMatch: string;
  clusterFamily: BenchmarkFamily;
  formulationCode: string;
  id: string;
  isCurrent: boolean;
  x: number;
  y: number;
}

export interface SimilarityMapCluster {
  count: number;
  cx: number;
  cy: number;
  family: Exclude<BenchmarkFamily, 'other'>;
  rx: number;
  ry: number;
}

export interface TrendSnapshot {
  averageBestScore: number;
  delta: number | null;
  direction: 'down' | 'flat' | 'up';
  previousAverageBestScore: number | null;
  productionReadyRatio: number;
  sampleSize: number;
}

export interface AdjustmentRecommendation {
  actualValue: number | null;
  benchmarkName: string;
  detail: string;
  direction: 'Decrease' | 'Increase';
  metricName: string;
  targetValue: number;
  trafficLight: TrafficLight;
  unit: string;
}

export type BenchmarkFamily = 'lifetime' | 'other' | 'x40';

export function formatDateLabel(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}

export function formatDateTimeLabel(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function formatMetricName(metricName: string): string {
  return metricName.replace(/_/g, ' ');
}

export function getLatestTestedAt(results?: FormulationResultsBundle | null): string | null {
  const values = [
    results?.physical?.testedAt,
    results?.durability?.testedAt,
    results?.environmental?.testedAt,
    results?.subjective?.ratedAt,
  ]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

  return values[0] ?? null;
}

export function getBestScore(scores: ScoreResult[]): ScoreResult | null {
  return scores.slice().sort((left, right) => right.overallScore - left.overallScore)[0] ?? null;
}

export function getBenchmarkFamily(name: string): BenchmarkFamily {
  const normalized = name.toLowerCase();

  if (normalized.includes('lifetime')) {
    return 'lifetime';
  }

  if (normalized.includes('franklin') || normalized.includes('x-40') || normalized.includes('x40')) {
    return 'x40';
  }

  return 'other';
}

export function getBenchmarkLabel(name: string): string {
  const family = getBenchmarkFamily(name);

  if (family === 'lifetime') {
    return 'Lifetime Benchmark';
  }

  if (family === 'x40') {
    return 'Franklin X-40 Benchmark';
  }

  return name;
}

export function buildSimilaritySummaries(scores: ScoreResult[]): SimilaritySummary[] {
  return scores
    .map((score) => ({
      benchmarkId: score.benchmarkId,
      benchmarkName: score.benchmarkSimilarity.benchmarkName,
      label: getBenchmarkLabel(score.benchmarkSimilarity.benchmarkName),
      overallScore: score.overallScore,
      similarity: score.benchmarkSimilarity.similarity,
      trafficLight: score.trafficLight,
    }))
    .sort((left, right) => right.similarity - left.similarity);
}

export function findScoreByFamily(
  scores: ScoreResult[],
  family: Exclude<BenchmarkFamily, 'other'>,
): ScoreResult | null {
  return scores.find((score) => getBenchmarkFamily(score.benchmarkSimilarity.benchmarkName) === family) ?? null;
}

export function buildSimilarityMap(rows: HistoricalAnalysisRow[], currentFormulationId: string) {
  const points = rows.flatMap((row) => {
    const lifetimeScore = findScoreByFamily(row.scores, 'lifetime');
    const x40Score = findScoreByFamily(row.scores, 'x40');

    if (!lifetimeScore || !x40Score) {
      return [];
    }

    return [{
      bestMatch: row.bestScore?.benchmarkSimilarity.benchmarkName ?? 'Unavailable',
      clusterFamily: row.bestScore ? getBenchmarkFamily(row.bestScore.benchmarkSimilarity.benchmarkName) : 'other',
      formulationCode: row.formulation.formulationCode,
      id: row.formulation.id,
      isCurrent: row.formulation.id === currentFormulationId,
      x: lifetimeScore.similarity,
      y: x40Score.similarity,
    }] satisfies SimilarityMapPoint[];
  });

  const clusters = (['lifetime', 'x40'] as const)
    .map((family) => buildCluster(points, family))
    .filter((cluster): cluster is SimilarityMapCluster => Boolean(cluster));

  return { clusters, points };
}

function buildCluster(
  points: SimilarityMapPoint[],
  family: Exclude<BenchmarkFamily, 'other'>,
): SimilarityMapCluster | null {
  const candidates = points.filter((point) => !point.isCurrent && point.clusterFamily === family);

  if (candidates.length === 0) {
    return null;
  }

  const cx = average(candidates.map((point) => point.x));
  const cy = average(candidates.map((point) => point.y));
  const rx = Math.max(6, Math.max(...candidates.map((point) => Math.abs(point.x - cx))) + 5);
  const ry = Math.max(6, Math.max(...candidates.map((point) => Math.abs(point.y - cy))) + 5);

  return {
    count: candidates.length,
    cx,
    cy,
    family,
    rx,
    ry,
  };
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function buildTrendSnapshot(rows: HistoricalAnalysisRow[], currentFormulationId?: string): TrendSnapshot {
  const ordered = rows
    .filter((row) => row.formulation.id !== currentFormulationId && row.bestScore)
    .slice()
    .sort((left, right) => {
      const leftDate = new Date(left.formulation.producedDate ?? 0).getTime();
      const rightDate = new Date(right.formulation.producedDate ?? 0).getTime();
      return rightDate - leftDate;
    });

  const latestWindow = ordered.slice(0, 5);
  const previousWindow = ordered.slice(5, 10);
  const averageBestScore = latestWindow.length > 0
    ? average(latestWindow.map((row) => row.bestScore?.overallScore ?? 0))
    : 0;
  const previousAverageBestScore = previousWindow.length > 0
    ? average(previousWindow.map((row) => row.bestScore?.overallScore ?? 0))
    : null;
  const delta = previousAverageBestScore == null
    ? null
    : Number((averageBestScore - previousAverageBestScore).toFixed(1));
  const direction = delta == null
    ? 'flat'
    : delta > 1
      ? 'up'
      : delta < -1
        ? 'down'
        : 'flat';
  const readyCount = latestWindow.filter((row) => row.bestScore?.productionReady).length;

  return {
    averageBestScore: Number(averageBestScore.toFixed(1)),
    delta,
    direction,
    previousAverageBestScore: previousAverageBestScore == null ? null : Number(previousAverageBestScore.toFixed(1)),
    productionReadyRatio: latestWindow.length > 0 ? Math.round((readyCount / latestWindow.length) * 100) : 0,
    sampleSize: latestWindow.length,
  };
}

export function buildAdjustmentRecommendations(score: ScoreResult | null): AdjustmentRecommendation[] {
  if (!score) {
    return [];
  }

  return score.metricScores
    .filter((metric) => !metric.isMissing && metric.trafficLight !== 'green')
    .slice()
    .sort((left, right) => severityRank(right.trafficLight) - severityRank(left.trafficLight) || right.normalizedDistance - left.normalizedDistance)
    .slice(0, 6)
    .map((metric) => {
      const rawValue = metric.rawValue;
      const direction = rawValue != null && rawValue > metric.targetValue ? 'Decrease' : 'Increase';
      const unit = metric.unit ?? '';
      const delta = rawValue == null ? 0 : Math.abs(rawValue - metric.targetValue);
      return {
        actualValue: rawValue,
        benchmarkName: score.benchmarkSimilarity.benchmarkName,
        detail: `${direction} ${formatMetricName(metric.metricName)} by ${delta.toFixed(2)}${unit ? ` ${unit}` : ''} toward ${metric.targetValue.toFixed(2)}${unit ? ` ${unit}` : ''}.`,
        direction,
        metricName: formatMetricName(metric.metricName),
        targetValue: metric.targetValue,
        trafficLight: metric.trafficLight,
        unit,
      };
    });
}

function severityRank(light: TrafficLight): number {
  if (light === 'red') {
    return 3;
  }

  if (light === 'yellow') {
    return 2;
  }

  return 1;
}

export function getTrafficLightDescription(light: TrafficLight): string {
  if (light === 'green') {
    return 'Within benchmark target range';
  }

  if (light === 'yellow') {
    return 'Near target range';
  }

  return 'Outside target range';
}
