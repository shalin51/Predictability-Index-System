import { useEffect, useMemo, useState } from 'react';
import { controlStyles } from '../../../../components/ui/controls';
import { EmptyState, MessageBanner } from '../../../../components/ui/Page';
import {
  generateBenchmarkScoring,
  getBenchmarkScoring,
  getScoreReport,
  regenerateBenchmarkScoring,
  type BenchmarkScoringRunDetail,
  type ScoreReport,
  type TrafficLight,
} from '../../../../services/api';
import { getBadgeToneStyle, getTextToneColor, getTrafficTone } from '../../../../theme/semantic';
import { colors, font, radius, spacing } from '../../../../theme/tokens';
import { formatValue, runStyles } from '../../productionRunUi';

export function BenchmarkScoringPanel({ runId }: { runId: string }) {
  const [detail, setDetail] = useState<BenchmarkScoringRunDetail | null>(null);
  const [selectedReport, setSelectedReport] = useState<ScoreReport | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    setError('');
    void getBenchmarkScoring(runId).then((next) => {
      setDetail(next);
      const selected = next.bestMatch ?? next.reports[0] ?? null;
      if (selected) {
        void getScoreReport(selected.id).then(setSelectedReport).catch(() => setSelectedReport(selected));
      } else {
        setSelectedReport(null);
      }
    }).catch((err: Error) => setError(err.message));
  };

  useEffect(load, [runId]);

  const similarityByBenchmark = useMemo(() => {
    const rows = detail?.reports ?? [];
    return {
      franklin: rows.find((report) => report.benchmarkCode === 'X40')?.overallSimilarityScore,
      lifetime: rows.find((report) => report.benchmarkCode === 'LIFETIME')?.overallSimilarityScore,
    };
  }, [detail]);

  if (!detail) {
    return error ? <MessageBanner tone="danger">{error}</MessageBanner> : <div style={runStyles.muted}>Loading...</div>;
  }

  const generate = async (regenerate = false) => {
    try {
      const next = regenerate ? await regenerateBenchmarkScoring(runId) : await generateBenchmarkScoring(runId);
      setDetail(next);
      setMessage(regenerate ? 'Score regenerated' : 'Score generated');
      const selected = next.bestMatch ?? next.reports[0] ?? null;
      setSelectedReport(selected ? await getScoreReport(selected.id) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scoring failed');
    }
  };

  return (
    <div style={runStyles.stack}>
      {error && <MessageBanner tone="danger">{error}</MessageBanner>}
      {message && <MessageBanner tone="success">{message}</MessageBanner>}
      <div style={runStyles.actions}>
        <button disabled={!detail.scoringReady} onClick={() => void generate(false)} style={{ ...controlStyles.primaryButton, ...(!detail.scoringReady ? styles.disabled : {}) }} type="button">Generate Score</button>
        <button disabled={!detail.scoringReady || detail.reports.length === 0} onClick={() => void generate(true)} style={{ ...controlStyles.secondaryButton, ...(!detail.scoringReady || detail.reports.length === 0 ? styles.disabled : {}) }} type="button">Regenerate Score</button>
      </div>
      <div style={styles.cardGrid}>
        <ScoreCard label="Best Match" value={detail.bestMatch?.benchmarkName ?? '-'} />
        <ScoreCard label="Predictability Index" value={formatScore(detail.bestMatch?.predictabilityIndex)} />
        <ScoreCard label="Franklin X-40 Similarity" value={formatPercent(similarityByBenchmark.franklin)} />
        <ScoreCard label="Lifetime Similarity" value={formatPercent(similarityByBenchmark.lifetime)} />
        <ScoreCard label="Production Readiness" value={formatPercent(detail.bestMatch?.productionReadinessScore)} />
        <ScoreCard label="Traffic Light" value={trafficLabel(detail.bestMatch?.trafficLight)} tone={detail.bestMatch?.trafficLight} />
      </div>
      {detail.reports.length === 0 ? (
        <EmptyState>No score reports.</EmptyState>
      ) : (
        <>
          <div style={runStyles.tableWrap}>
            <table style={runStyles.table}>
              <thead>
                <tr>
                  {['Benchmark', 'Similarity', 'Predictability', 'Readiness', 'Traffic Light'].map((column) => <th key={column} style={runStyles.th}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {detail.reports.map((report) => (
                  <tr key={report.id} onClick={() => void getScoreReport(report.id).then(setSelectedReport).catch((err: Error) => setError(err.message))} style={styles.clickRow}>
                    <td style={runStyles.td}>{report.benchmarkName}{report.isBestMatch ? ' (Best)' : ''}</td>
                    <td style={runStyles.td}>{formatPercent(report.overallSimilarityScore)}</td>
                    <td style={runStyles.td}>{formatScore(report.predictabilityIndex)}</td>
                    <td style={runStyles.td}>{formatPercent(report.productionReadinessScore)}</td>
                    <td style={runStyles.td}><TrafficBadge trafficLight={report.trafficLight} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedReport && (
            <>
              <RiskPanel risks={selectedReport.keyRisks} />
              <div style={runStyles.tableWrap}>
                <table style={runStyles.table}>
                  <thead>
                    <tr>
                      {['Metric', 'Run Mean', 'Benchmark Target', 'Range', 'Score', 'Status'].map((column) => <th key={column} style={runStyles.th}>{column}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReport.metrics ?? []).map((metric) => (
                      <tr key={metric.id}>
                        <td style={runStyles.td}>{metric.metricName}</td>
                        <td style={runStyles.td}>{formatValue(metric.runMeanValue)}</td>
                        <td style={runStyles.td}>{formatValue(metric.benchmarkTargetMean)}</td>
                        <td style={runStyles.td}>{formatValue(metric.minAcceptable)} - {formatValue(metric.maxAcceptable)}</td>
                        <td style={runStyles.td}>{formatScore(metric.metricScore)}</td>
                        <td style={runStyles.td}><TrafficBadge trafficLight={metric.trafficLight} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={runStyles.panel}>
                <strong>Recommendations</strong>
                <div style={runStyles.muted}>{selectedReport.recommendations?.[0] ?? 'Recommendations will be generated in the reporting workflow.'}</div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ScoreCard({ label, tone, value }: { label: string; tone?: TrafficLight; value: string }) {
  return (
    <div style={runStyles.panel}>
      <div style={runStyles.muted}>{label}</div>
      <strong style={{ color: tone ? trafficColor(tone) : colors.text.primary, fontSize: font.size.h2 }}>{value}</strong>
    </div>
  );
}

function RiskPanel({ risks }: { risks: string[] }) {
  return (
    <div style={runStyles.panel}>
      <strong>Main Risks</strong>
      {risks.length === 0 ? <div style={runStyles.muted}>No key risks detected.</div> : (
        <ul>
          {risks.map((risk) => <li key={risk}>{risk}</li>)}
        </ul>
      )}
    </div>
  );
}

function TrafficBadge({ trafficLight }: { trafficLight: TrafficLight }) {
  return <span style={{ ...styles.badge, ...getBadgeToneStyle(getTrafficTone(trafficLight)) }}>{trafficLabel(trafficLight)}</span>;
}

function formatPercent(value?: number) {
  return value == null ? '-' : `${Math.round(value)}%`;
}

function formatScore(value?: number) {
  return value == null ? '-' : String(Math.round(value));
}

function trafficLabel(value?: TrafficLight) {
  if (!value) return '-';
  return value[0].toUpperCase() + value.slice(1);
}

function trafficColor(value: TrafficLight) {
  return getTextToneColor(getTrafficTone(value));
}

const styles = {
  badge: { borderRadius: radius.sm, display: 'inline-flex', fontSize: font.size.small, fontWeight: font.weight.semibold, padding: '4px 8px' },
  cardGrid: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  clickRow: { cursor: 'pointer' },
  disabled: { cursor: 'not-allowed', opacity: 0.5 },
};
