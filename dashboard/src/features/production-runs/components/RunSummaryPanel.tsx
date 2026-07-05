import { useEffect, useState } from 'react';
import { Divider } from '../../../components/ui/Card';
import { controlStyles } from '../../../components/ui/controls';
import { EmptyState, MessageBanner } from '../../../components/ui/Page';
import {
  generateRunSummary,
  getRunSummary,
  regenerateRunSummary,
  type RunSummaryDetail,
  type RunSummaryStatus,
} from '../../../services/api';
import { colors, font, radius, spacing } from '../../../theme/tokens';
import { formatValue, runStyles } from '../productionRunUi';

const statusLabels: Record<RunSummaryStatus, string> = {
  generated: 'Generated',
  incomplete: 'Incomplete',
  not_generated: 'Not Generated',
  ready_for_scoring: 'Ready for Scoring',
  stale: 'Stale',
};

export function RunSummaryPanel({ runId }: { runId: string }) {
  const [detail, setDetail] = useState<RunSummaryDetail | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    setError('');
    void getRunSummary(runId).then(setDetail).catch((err: Error) => setError(err.message));
  };

  useEffect(load, [runId]);

  if (!detail) {
    return error ? <MessageBanner tone="danger">{error}</MessageBanner> : <div style={runStyles.muted}>Loading...</div>;
  }

  const canGenerate = detail.run.labTestingStatus === 'completed' && detail.missingRequiredMetrics.length === 0;
  const generated = detail.summaries.length > 0;

  const generate = async (regenerate = false) => {
    try {
      const next = regenerate ? await regenerateRunSummary(runId) : await generateRunSummary(runId);
      setDetail(next);
      setMessage(regenerate ? 'Summary regenerated' : 'Summary generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summary generation failed');
    }
  };

  return (
    <div style={runStyles.stack}>
      {error && <MessageBanner tone="danger">{error}</MessageBanner>}
      {message && <MessageBanner tone="success">{message}</MessageBanner>}
      <div style={styles.headerGrid}>
        <div style={runStyles.panel}>Run Code<br /><strong>{detail.run.runCode}</strong></div>
        <div style={runStyles.panel}>Formulation<br /><strong>{detail.run.formulation}</strong></div>
        <div style={runStyles.panel}>Target Benchmark<br /><strong>{detail.run.targetBenchmark ?? '-'}</strong></div>
        <div style={runStyles.panel}>Lab Testing Status<br /><strong>{detail.run.labTestingStatus}</strong></div>
        <div style={runStyles.panel}>Summary Status<br /><strong>{statusLabels[detail.status]}</strong></div>
        <div style={runStyles.panel}>Last Generated<br /><strong>{formatValue(detail.run.lastGeneratedAt)}</strong></div>
      </div>
      <div style={runStyles.actions}>
        <button disabled={!canGenerate} onClick={() => void generate(false)} style={{ ...controlStyles.primaryButton, ...(!canGenerate ? styles.disabled : {}) }} type="button">Generate Summary</button>
        <button disabled={!canGenerate || !generated} onClick={() => void generate(true)} style={{ ...controlStyles.secondaryButton, ...(!canGenerate || !generated ? styles.disabled : {}) }} type="button">Regenerate Summary</button>
        <button onClick={load} style={controlStyles.secondaryButton} type="button">View Missing Metrics</button>
        <button disabled={!detail.canContinueToScoring} style={{ ...controlStyles.secondaryButton, ...(!detail.canContinueToScoring ? styles.disabled : {}) }} type="button">Continue to Benchmark Scoring</button>
      </div>
      {detail.missingRequiredMetrics.length > 0 && (
        <div style={runStyles.tableWrap}>
          <table style={runStyles.table}>
            <thead>
              <tr>
                {['Missing Metric', 'Category', 'Required Samples', 'Existing Results'].map((column) => <th key={column} style={runStyles.th}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {detail.missingRequiredMetrics.map((metric) => (
                <tr key={metric.id}>
                  <td style={runStyles.td}>{metric.metricName}</td>
                  <td style={runStyles.td}>{metric.category}</td>
                  <td style={runStyles.td}>{metric.requiredSamples}</td>
                  <td style={runStyles.td}>{metric.existingResults}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Divider />
      {detail.summaries.length === 0 ? (
        <EmptyState>No run metric summaries.</EmptyState>
      ) : (
        <div style={runStyles.tableWrap}>
          <table style={runStyles.table}>
            <thead>
              <tr>
                {['Metric', 'Category', 'Condition', 'N', 'Mean', 'Std Dev', 'Min', 'Max', 'Unit', 'Status'].map((column) => <th key={column} style={runStyles.th}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {detail.summaries.map((summary) => (
                <tr key={summary.id}>
                  <td style={runStyles.td}>{summary.metricName}</td>
                  <td style={runStyles.td}>{summary.category}</td>
                  <td style={runStyles.td}>{summary.conditionName ?? '-'}</td>
                  <td style={runStyles.td}>{summary.nSamples}</td>
                  <td style={runStyles.td}>{formatValue(summary.meanValue)}</td>
                  <td style={runStyles.td}>{formatValue(summary.stdDev)}</td>
                  <td style={runStyles.td}>{formatValue(summary.minValue)}</td>
                  <td style={runStyles.td}>{formatValue(summary.maxValue)}</td>
                  <td style={runStyles.td}>{summary.unit ?? '-'}</td>
                  <td style={runStyles.td}><span style={styles.ready}>{summary.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  disabled: { cursor: 'not-allowed', opacity: 0.5 },
  headerGrid: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  ready: {
    backgroundColor: colors.status.okBg,
    borderRadius: radius.sm,
    color: colors.status.ok,
    display: 'inline-flex',
    fontSize: font.size.small,
    fontWeight: font.weight.semibold,
    padding: '4px 8px',
  },
};
