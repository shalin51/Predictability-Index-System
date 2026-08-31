import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { EmptyState, MessageBanner } from '../../../components/ui/Page';
import { generateRunPrediction, listRunPredictions, type PredictionRecord } from '../../../services/api';
import { colors, font, spacing } from '../../../theme/tokens';

export function PredictionPanel({ readOnly, runId }: { readOnly: boolean; runId: string }) {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    void listRunPredictions(runId)
      .then(setPredictions)
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [runId]);

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      const result = await generateRunPrediction(runId);
      setPredictions((current) => [result, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Prediction failed');
      void listRunPredictions(runId).then(setPredictions).catch(() => undefined);
    } finally {
      setGenerating(false);
    }
  };

  const latest = predictions[0];
  return (
    <section style={styles.stack}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Predicted Outcomes</h2>
          <p style={styles.subtitle}>Model estimates based on formulation, material lots, equipment, and process settings.</p>
        </div>
        {!readOnly && <Button disabled={generating} onClick={() => void generate()} type="button">{generating ? 'Running...' : 'Start Prediction Run'}</Button>}
      </div>
      {error && <MessageBanner tone="danger">{error}</MessageBanner>}
      {loading ? <div style={styles.subtitle}>Loading...</div> : !latest ? (
        <EmptyState>No prediction has been generated for this run.</EmptyState>
      ) : latest.status !== 'completed' ? (
        <EmptyState>
          {latest.status === 'running'
            ? 'A prediction is currently running for this run.'
            : `The latest prediction run failed${latest.failureMessage ? `: ${latest.failureMessage}` : '.'}`}
        </EmptyState>
      ) : (
        <>
          <div style={styles.meta}>Generated {new Date(latest.generatedAt).toLocaleString()} · {latest.modelLabel ?? 'Model'} · {latest.modelId}</div>
          <div style={styles.grid}>
            {latest.metrics.map((metric) => (
              <div key={metric.metricKey} style={styles.metric}>
                <span style={styles.label}>{metric.metricName}{metric.conditionCode ? ` (${metric.conditionCode})` : ''}</span>
                <strong style={styles.value}>{formatNumber(metric.predictedValue)}{metric.unit ? ` ${metric.unit}` : ''}</strong>
              </div>
            ))}
          </div>
        </>
      )}
      {!loading && predictions.length > 0 && (
        <div style={styles.logs}>
          <h3 style={styles.logTitle}>Execution Logs</h3>
          {predictions.map((prediction) => (
            <div key={prediction.id} style={styles.logRow}>
              <span style={styles.status} data-status={prediction.status}>{prediction.status.toUpperCase()}</span>
              <span>{new Date(prediction.startedAt).toLocaleString()}</span>
              <span>{prediction.modelLabel ?? prediction.modelId}</span>
              <span>{prediction.status === 'completed' ? `${prediction.metrics.length} metrics` : prediction.failureMessage ?? 'In progress'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

const styles: Record<string, CSSProperties> = {
  grid: { display: 'grid', gap: spacing.space3, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' },
  header: { alignItems: 'flex-start', display: 'flex', gap: spacing.space4, justifyContent: 'space-between' },
  label: { color: colors.text.secondary, fontSize: font.size.sm },
  logs: { borderTop: `1px solid ${colors.border}`, display: 'grid', gap: spacing.space2, paddingTop: spacing.space4 },
  logTitle: { margin: 0 },
  logRow: { alignItems: 'center', display: 'grid', gap: spacing.space3, gridTemplateColumns: '100px minmax(160px, 1fr) minmax(180px, 1fr) minmax(180px, 2fr)', padding: `${spacing.space2}px 0` },
  meta: { color: colors.text.muted, fontSize: font.size.sm },
  metric: { background: colors.surfaceMuted, border: `1px solid ${colors.border}`, borderRadius: 8, display: 'grid', gap: spacing.space2, padding: spacing.space4 },
  stack: { display: 'grid', gap: spacing.space4 },
  status: { color: colors.text.secondary, fontSize: font.size.sm, fontWeight: 700 },
  subtitle: { color: colors.text.secondary, margin: `${spacing.space1}px 0 0` },
  title: { margin: 0 },
  value: { color: colors.text.primary, fontSize: font.size.h2 },
};
