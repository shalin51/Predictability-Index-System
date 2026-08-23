import { useEffect, useState } from 'react';
import { EmptyState, MessageBanner } from '../../../../components/ui/Page';
import {
  getBenchmarkScoring,
  getScoreReport,
  type BenchmarkScoringRunDetail,
  type ScoreReport,
  type ScoreReportMetric,
} from '../../../../services/api';
import { font, spacing } from '../../../../theme/tokens';
import { formatValue, runStyles } from '../../productionRunUi';

export function BenchmarkScoringPanel({ runId }: { runId: string }) {
  const [detail, setDetail] = useState<BenchmarkScoringRunDetail | null>(null);
  const [selectedReport, setSelectedReport] = useState<ScoreReport | null>(null);
  const [error, setError] = useState('');

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

  if (!detail) {
    return error ? <MessageBanner tone="danger">{error}</MessageBanner> : <div style={runStyles.muted}>Loading...</div>;
  }
  const selectedPoints = selectedReport?.metrics?.reduce((sum, metric) => sum + points(metric), 0) ?? 0;

  return (
    <div style={runStyles.stack}>
      {error && <MessageBanner tone="danger">{error}</MessageBanner>}
      {detail.reports.length === 0 ? (
        <EmptyState>No score reports.</EmptyState>
      ) : (
        <>
          <div style={runStyles.tableWrap}>
            <table style={runStyles.table}>
              <thead>
                <tr>
                  {['Benchmark', 'Scoring Profile', 'Final Score'].map((column) => <th key={column} style={runStyles.th}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {detail.reports.map((report) => (
                  <tr key={report.id} onClick={() => void getScoreReport(report.id).then(setSelectedReport).catch((err: Error) => setError(err.message))} style={styles.clickRow}>
                    <td style={runStyles.td}>{report.benchmarkName}{report.isBestMatch ? ' (Best)' : ''}</td>
                    <td style={runStyles.td}>{String(report.scoringProfileName ?? report.scoringCode ?? '-')}</td>
                    <td style={runStyles.td}>{formatPercent(report.overallSimilarityScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedReport && (
            <>
              <div style={runStyles.tableWrap}>
                <div style={styles.reportTitle}>{selectedReport.benchmarkName} &amp; {String(selectedReport.scoringProfileName ?? selectedReport.scoringCode ?? 'Scoring Profile')} — Final Score: {formatPoints(selectedPoints)}</div>
                <table style={runStyles.table}>
                  <thead>
                    <tr>
                      {['Test Type', formatRunName(detail.run.runCode), selectedReport.benchmarkName, 'Absolute Deviation (%)', 'Points'].map((column) => <th key={column} style={runStyles.th}>{column}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReport.metrics ?? []).map((metric) => (
                      <tr key={metric.id}>
                        <td style={runStyles.td}>{metric.metricName}</td>
                        <td style={runStyles.td}>{formatValue(metric.runMeanValue)}</td>
                        <td style={runStyles.td}>{formatValue(metric.benchmarkTargetMean)}</td>
                        <td style={runStyles.td}>{formatPercent(metric.metricScore)}</td>
                        <td style={runStyles.td}>{formatPoints(points(metric))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function formatPercent(value?: number) {
  return value == null ? '-' : `${Math.round(value)}%`;
}

function formatPoints(value?: number) {
  return value == null ? '-' : value.toFixed(2);
}

function points(metric: ScoreReportMetric) {
  return metric.metricScore * (metric.weight / 100);
}

function formatRunName(runCode: string) {
  return runCode.replace(/-pr$/i, '').replace(/(^|-)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

const styles = {
  clickRow: { cursor: 'pointer' },
  reportTitle: { fontWeight: font.weight.semibold, padding: spacing.space3 },
};
