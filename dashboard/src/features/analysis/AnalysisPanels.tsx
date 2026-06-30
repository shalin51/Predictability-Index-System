import type { CSSProperties } from 'react';
import { colors, font, radius, spacing } from '../../theme/tokens';
import type { HistoricalAnalysisRow, SimilaritySummary, TrendSnapshot, AdjustmentRecommendation } from './analysisInsights';
import { buildSimilarityMap, formatDateLabel, formatMetricName, getTrafficLightDescription } from './analysisInsights';
import type { TrafficLight } from '../../services/api';

export function FormulationSummaryPanel({
  formulationId,
  predictabilityIndex,
  testedAt,
}: {
  formulationId: string;
  predictabilityIndex: number | null;
  testedAt?: string | null;
}) {
  return (
    <div style={styles.panel}>
      <div style={styles.sectionLabel}>New Formulation Summary</div>
      <div style={styles.summaryGrid}>
        <SummaryStat label="Formulation ID" value={formulationId || '—'} />
        <SummaryStat label="Date Tested" value={formatDateLabel(testedAt)} />
        <SummaryStat label="Predictability Index" value={predictabilityIndex == null ? '—' : predictabilityIndex.toFixed(1)} />
      </div>
    </div>
  );
}

export function TrafficLightIndicatorCard({
  benchmarkName,
  trafficLight,
}: {
  benchmarkName?: string;
  trafficLight: TrafficLight | null;
}) {
  return (
    <div style={styles.panel}>
      <div style={styles.sectionHeader}>
        <div>
          <div style={styles.sectionLabel}>Traffic Light Indicator</div>
          <div style={styles.sectionTitle}>{benchmarkName ?? 'Benchmark target status'}</div>
        </div>
        <span style={{ ...styles.trafficBadge, ...(trafficLight ? trafficBadgeStyles[trafficLight] : trafficBadgeStyles.red) }}>
          {trafficLight ?? 'red'}
        </span>
      </div>
      <div style={styles.legend}>
        {(['green', 'yellow', 'red'] as TrafficLight[]).map((value) => (
          <div
            key={value}
            style={{
              ...styles.legendRow,
              ...(trafficLight === value ? styles.legendRowActive : {}),
            }}
          >
            <span style={{ ...styles.legendChip, ...(trafficBadgeStyles[value]) }} />
            <span style={styles.legendLabel}>{value}</span>
            <span style={styles.legendText}>{getTrafficLightDescription(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimilarityScoresPanel({ scores }: { scores: SimilaritySummary[] }) {
  return (
    <div style={styles.panel}>
      <div style={styles.sectionLabel}>Similarity Scores</div>
      <div style={styles.scoreGrid}>
        {scores.map((score) => (
          <div key={score.benchmarkId} style={styles.scoreCard}>
            <div style={styles.scoreTitle}>{score.label}</div>
            <div style={styles.scoreMeta}>{score.benchmarkName}</div>
            <div style={styles.scoreValue}>{score.similarity.toFixed(1)}%</div>
            <div style={styles.scoreFoot}>Predictability Index {score.overallScore.toFixed(1)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimilarityPerformanceMap({
  currentFormulationId,
  rows,
}: {
  currentFormulationId: string;
  rows: HistoricalAnalysisRow[];
}) {
  const { clusters, points } = buildSimilarityMap(rows, currentFormulationId);
  const width = 760;
  const height = 360;
  const padding = 40;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const currentPoint = points.find((point) => point.isCurrent) ?? null;

  return (
    <div style={styles.panel}>
      <div style={styles.sectionLabel}>Similarity Visualization</div>
      <div style={styles.mapTitle}>Lifetime vs Franklin X-40 performance map</div>
      <svg role="img" style={styles.map} viewBox={`0 0 ${width} ${height}`}>
        <rect fill={colors.surfaceElevated} height={height} rx={20} width={width} />
        {Array.from({ length: 5 }).map((_, index) => {
          const position = index / 4;
          const x = padding + plotWidth * position;
          const y = padding + plotHeight * (1 - position);
          return (
            <g key={index}>
              <line stroke={colors.border} strokeDasharray="6 6" x1={x} x2={x} y1={padding} y2={height - padding} />
              <line stroke={colors.border} strokeDasharray="6 6" x1={padding} x2={width - padding} y1={y} y2={y} />
              <text fill={colors.text.muted} fontSize="10" x={x - 8} y={height - 14}>{Math.round(position * 100)}</text>
              <text fill={colors.text.muted} fontSize="10" x={8} y={y + 4}>{Math.round(position * 100)}</text>
            </g>
          );
        })}
        <line stroke={colors.text.muted} x1={padding} x2={padding} y1={padding} y2={height - padding} />
        <line stroke={colors.text.muted} x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        {clusters.map((cluster) => (
          <g key={cluster.family}>
            <ellipse
              cx={toX(cluster.cx, plotWidth, padding)}
              cy={toY(cluster.cy, plotHeight, padding)}
              fill={cluster.family === 'lifetime' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)'}
              rx={Math.max((cluster.rx / 100) * plotWidth, 18)}
              ry={Math.max((cluster.ry / 100) * plotHeight, 18)}
              stroke={cluster.family === 'lifetime' ? colors.status.ok : colors.status.warning}
              strokeDasharray="8 6"
            />
            <text
              fill={cluster.family === 'lifetime' ? colors.status.ok : colors.status.warning}
              fontSize="11"
              x={toX(cluster.cx, plotWidth, padding) + 8}
              y={toY(cluster.cy, plotHeight, padding) - 10}
            >
              {cluster.family === 'lifetime' ? 'Lifetime cluster' : 'X-40 cluster'} ({cluster.count})
            </text>
          </g>
        ))}
        {points.filter((point) => !point.isCurrent).map((point) => (
          <circle
            key={point.id}
            cx={toX(point.x, plotWidth, padding)}
            cy={toY(point.y, plotHeight, padding)}
            fill={point.clusterFamily === 'lifetime' ? colors.status.ok : point.clusterFamily === 'x40' ? colors.status.warning : colors.text.muted}
            fillOpacity={point.clusterFamily === 'other' ? 0.5 : 0.72}
            r={4}
          />
        ))}
        {currentPoint && (
          <g>
            <circle
              cx={toX(currentPoint.x, plotWidth, padding)}
              cy={toY(currentPoint.y, plotHeight, padding)}
              fill={colors.accent}
              r={8}
              stroke="#ffffff"
              strokeWidth={2}
            />
            <text
              fill={colors.text.primary}
              fontSize="11"
              x={toX(currentPoint.x, plotWidth, padding) + 10}
              y={toY(currentPoint.y, plotHeight, padding) - 10}
            >
              Current formulation
            </text>
          </g>
        )}
        <text fill={colors.text.secondary} fontSize="12" x={width / 2 - 70} y={height - 8}>Lifetime Benchmark Similarity</text>
        <text
          fill={colors.text.secondary}
          fontSize="12"
          transform={`translate(14 ${height / 2 + 70}) rotate(-90)`}
        >
          Franklin X-40 Benchmark Similarity
        </text>
      </svg>
      <div style={styles.legendStrip}>
        <LegendDot color={colors.text.muted} label="Historical Ameriball formulations" />
        <LegendDot color={colors.status.ok} label="Lifetime cluster" />
        <LegendDot color={colors.status.warning} label="X-40 cluster" />
        <LegendDot color={colors.accent} label="Current formulation" />
      </div>
    </div>
  );
}

export function TrendSummaryPanel({ trend }: { trend: TrendSnapshot }) {
  return (
    <div style={styles.panel}>
      <div style={styles.sectionLabel}>Trend Analysis</div>
      <div style={styles.summaryGrid}>
        <SummaryStat label="Recent Average" value={trend.averageBestScore.toFixed(1)} />
        <SummaryStat label="Previous Average" value={trend.previousAverageBestScore == null ? '—' : trend.previousAverageBestScore.toFixed(1)} />
        <SummaryStat label="Direction" value={trend.direction} />
        <SummaryStat label="Production Ready" value={`${trend.productionReadyRatio}%`} />
      </div>
      <div style={styles.sectionFoot}>
        Based on the latest {trend.sampleSize} historical formulations.
        {trend.delta != null ? ` Delta vs previous window: ${trend.delta > 0 ? '+' : ''}${trend.delta.toFixed(1)}.` : ''}
      </div>
    </div>
  );
}

export function AdjustmentPanel({ recommendations }: { recommendations: AdjustmentRecommendation[] }) {
  return (
    <div style={styles.panel}>
      <div style={styles.sectionLabel}>Recommended Formulation Adjustments</div>
      {recommendations.length === 0 ? (
        <div style={styles.empty}>No adjustments recommended.</div>
      ) : (
        <div style={styles.adjustmentList}>
          {recommendations.map((recommendation) => (
            <div key={`${recommendation.benchmarkName}-${recommendation.metricName}`} style={styles.adjustmentCard}>
              <div style={styles.adjustmentHeader}>
                <div>
                  <div style={styles.adjustmentMetric}>{formatMetricName(recommendation.metricName)}</div>
                  <div style={styles.adjustmentBenchmark}>{recommendation.benchmarkName}</div>
                </div>
                <span style={{ ...styles.trafficBadge, ...trafficBadgeStyles[recommendation.trafficLight] }}>
                  {recommendation.direction}
                </span>
              </div>
              <div style={styles.adjustmentBody}>{recommendation.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={styles.legendItem}>
      <span style={{ ...styles.legendDot, backgroundColor: color }} />
      <span style={styles.legendText}>{label}</span>
    </div>
  );
}

function toX(value: number, plotWidth: number, padding: number): number {
  return padding + (value / 100) * plotWidth;
}

function toY(value: number, plotHeight: number, padding: number): number {
  return padding + plotHeight - (value / 100) * plotHeight;
}

const trafficBadgeStyles: Record<TrafficLight, CSSProperties> = {
  green: {
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
    color: colors.status.ok,
  },
  red: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    color: colors.status.error,
  },
  yellow: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    color: colors.status.warning,
  },
};

const styles: Record<string, CSSProperties> = {
  panel: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    padding: spacing.md,
  },
  sectionLabel: {
    color: colors.text.muted,
    fontFamily: font.mono,
    fontSize: font.size.xs,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  summaryGrid: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  summaryLabel: {
    color: colors.text.muted,
    fontSize: font.size.xs,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text.primary,
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    marginTop: 6,
  },
  trafficBadge: {
    borderRadius: 999,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    padding: '6px 10px',
    textTransform: 'uppercase',
  },
  legend: {
    display: 'grid',
    gap: spacing.xs,
  },
  legendRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: '14px 52px minmax(0, 1fr)',
    padding: `${spacing.sm}px ${spacing.md}px`,
  },
  legendRowActive: {
    border: `1px solid ${colors.borderStrong}`,
  },
  legendChip: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  legendLabel: {
    color: colors.text.primary,
    fontWeight: font.weight.semibold,
    textTransform: 'capitalize',
  },
  legendText: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
  },
  scoreGrid: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  scoreCard: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  scoreTitle: {
    color: colors.text.primary,
    fontWeight: font.weight.semibold,
  },
  scoreMeta: {
    color: colors.text.secondary,
    fontSize: font.size.xs,
    marginTop: 4,
  },
  scoreValue: {
    color: colors.accent,
    fontSize: '1.9rem',
    fontWeight: font.weight.bold,
    marginTop: spacing.sm,
  },
  scoreFoot: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    marginTop: 6,
  },
  mapTitle: {
    color: colors.text.primary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  },
  map: {
    borderRadius: radius.md,
    width: '100%',
  },
  legendStrip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    alignItems: 'center',
    display: 'flex',
    gap: 8,
  },
  legendDot: {
    borderRadius: 999,
    display: 'inline-block',
    height: 10,
    width: 10,
  },
  sectionFoot: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    lineHeight: 1.6,
  },
  adjustmentList: {
    display: 'grid',
    gap: spacing.sm,
  },
  adjustmentCard: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  adjustmentHeader: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  adjustmentMetric: {
    color: colors.text.primary,
    fontWeight: font.weight.semibold,
  },
  adjustmentBenchmark: {
    color: colors.text.secondary,
    fontSize: font.size.xs,
    marginTop: 4,
  },
  adjustmentBody: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    lineHeight: 1.6,
    marginTop: spacing.sm,
  },
  empty: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
};
