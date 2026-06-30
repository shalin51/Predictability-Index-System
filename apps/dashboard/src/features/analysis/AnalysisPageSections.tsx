import { EmptyState } from '../../components/ui/Page';
import { StatusDot } from '../../components/ui/StatusDot';
import type { ScoreResult, TrafficLight } from '../../services/api';
import { colors } from '../../theme/tokens';
import { analysisPageStyles } from './analysisPageStyles';

export function TrafficBadge({ status }: { status: TrafficLight }) {
  const bg: Record<TrafficLight, string> = {
    green: '#14532d',
    yellow: '#713f12',
    red: '#7f1d1d',
  };
  const text: Record<TrafficLight, string> = {
    green: '#86efac',
    yellow: '#fde68a',
    red: '#fca5a5',
  };

  return (
    <span style={{ ...analysisPageStyles.trafficBadge, background: bg[status], color: text[status] }}>
      {status}
    </span>
  );
}

export function ScoreCard({ score }: { score: ScoreResult }) {
  const color = score.trafficLight === 'green'
    ? colors.status.ok
    : score.trafficLight === 'yellow'
      ? colors.status.warning
      : colors.status.error;

  return (
    <div style={analysisPageStyles.scoreCardInner}>
      <div style={analysisPageStyles.scoreCardTitle}>{score.benchmarkSimilarity.benchmarkName}</div>
      <div style={analysisPageStyles.scoreCardValueRow}>
        <span style={{ ...analysisPageStyles.scoreCardValue, color }}>{score.overallScore.toFixed(1)}</span>
        <div>
          <div style={analysisPageStyles.scoreCardScale}>/ 100</div>
          <TrafficBadge status={score.trafficLight} />
        </div>
      </div>
      {score.keyRisks.length > 0 && (
        <ul style={analysisPageStyles.scoreRiskList}>
          {score.keyRisks.slice(0, 3).map((risk) => (
            <li key={risk} style={analysisPageStyles.scoreRiskItem}>{risk}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MetricTable({ metrics }: { metrics: ScoreResult['metricScores'] }) {
  const categories = [...new Set(metrics.map((metric) => metric.metricCategory))];

  return (
    <div style={analysisPageStyles.metricTableWrap}>
      {categories.map((category) => (
        <div key={category} style={analysisPageStyles.metricCategory}>
          <div style={analysisPageStyles.metricCategoryTitle}>{category}</div>
          <table style={analysisPageStyles.table}>
            <thead>
              <tr style={analysisPageStyles.tableHeadRow}>
                <th style={analysisPageStyles.th}>Metric</th>
                <th style={analysisPageStyles.th}>Actual</th>
                <th style={analysisPageStyles.th}>Target</th>
                <th style={analysisPageStyles.th}>Range</th>
                <th style={analysisPageStyles.th}>Score</th>
                <th style={analysisPageStyles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics
                .filter((metric) => metric.metricCategory === category)
                .map((metric) => (
                  <tr key={metric.metricName} style={analysisPageStyles.tableRow}>
                    <td style={analysisPageStyles.td}>{metric.metricName.replace(/_/g, ' ')}</td>
                    <td style={analysisPageStyles.td}>
                      {metric.isMissing
                        ? <span style={analysisPageStyles.muted}>—</span>
                        : `${metric.rawValue?.toFixed(2) ?? '—'} ${metric.unit ?? ''}`}
                    </td>
                    <td style={analysisPageStyles.td}>{metric.targetValue.toFixed(2)} {metric.unit ?? ''}</td>
                    <td style={analysisPageStyles.td}>
                      {metric.minAcceptable != null && metric.maxAcceptable != null
                        ? `${metric.minAcceptable}-${metric.maxAcceptable}`
                        : '—'}
                    </td>
                    <td style={analysisPageStyles.td}>{metric.score.toFixed(1)}</td>
                    <td style={analysisPageStyles.td}>
                      <StatusDot status={metric.trafficLight as 'ok' | 'error' | 'checking'} size={12} />
                      {metric.isMissing ? 'Missing' : metric.trafficLight}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={analysisPageStyles.summaryCard}>
      <div style={analysisPageStyles.summaryLabel}>{label}</div>
      <div style={analysisPageStyles.summaryValue}>{value}</div>
    </div>
  );
}

export function RiskGrid({ risks }: { risks: Array<{ count: number; name: string }> }) {
  if (risks.length === 0) {
    return <EmptyState>Run an analysis to view risk breakdown.</EmptyState>;
  }

  return (
    <div style={analysisPageStyles.riskRows}>
      {risks.map((risk) => (
        <div key={risk.name} style={analysisPageStyles.riskCard}>
          <div style={analysisPageStyles.riskTitle}>{risk.name}</div>
          <div style={analysisPageStyles.riskMeta}>{risk.count} occurrence(s)</div>
        </div>
      ))}
    </div>
  );
}

export function HistoryTable({
  history,
}: {
  history: Array<{ formulation: { formulationCode: string; id: string; producedDate?: string }; bestScore: ScoreResult | null }>;
}) {
  return (
    <table style={analysisPageStyles.table}>
      <thead>
        <tr style={analysisPageStyles.tableHeadRow}>
          <th style={analysisPageStyles.th}>Formulation</th>
          <th style={analysisPageStyles.th}>Produced</th>
          <th style={analysisPageStyles.th}>Best Benchmark</th>
          <th style={analysisPageStyles.th}>Best Score</th>
        </tr>
      </thead>
      <tbody>
        {history.map((row) => (
          <tr key={row.formulation.id} style={analysisPageStyles.tableRow}>
            <td style={analysisPageStyles.td}>{row.formulation.formulationCode}</td>
            <td style={analysisPageStyles.td}>{row.formulation.producedDate ?? '—'}</td>
            <td style={analysisPageStyles.td}>{row.bestScore?.benchmarkSimilarity.benchmarkName ?? 'Unavailable'}</td>
            <td style={analysisPageStyles.td}>{row.bestScore ? row.bestScore.overallScore.toFixed(1) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
