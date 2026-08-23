import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { controlStyles } from '../../../components/ui/controls';
import { EmptyState, MessageBanner } from '../../../components/ui/Page';
import {
  getLabTestingResults,
  type LabMetric,
  type LabResultRecord,
  type LabTestingResultsResponse,
  type SampleRecord,
} from '../../../services/api';
import { colors, font, radius, spacing } from '../../../theme/tokens';
import { formatLabValue, labStyles } from '../labTestingUi';

interface ReadOnlyLabResultsPanelProps {
  onOpenLabRun?: (runId: string) => void;
  runId: string;
  title?: string;
}

interface DisplayResult {
  category: string;
  id: string;
  method: string;
  metric: string;
  sample: string;
  testedAt: unknown;
  unit: string;
  value: unknown;
}

export function ReadOnlyLabResultsPanel({ onOpenLabRun, runId, title }: ReadOnlyLabResultsPanelProps) {
  const [data, setData] = useState<LabTestingResultsResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    void getLabTestingResults(runId).then(setData).catch((err: Error) => setError(err.message));
  }, [runId]);

  const rows = useMemo(() => data ? buildRows(data) : [], [data]);

  if (error) return <MessageBanner tone="danger">{error}</MessageBanner>;
  if (!data) return <div style={labStyles.muted}>Loading lab results...</div>;

  return (
    <section style={styles.panel}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>{title ?? data.run.runCode}</h3>
          <div style={styles.summary}>
            <span>{data.samples.length} samples</span>
            <span>{rows.length} results</span>
            <span>{data.run.missingRequiredMetrics} required results missing</span>
          </div>
        </div>
        {onOpenLabRun && (
          <button onClick={() => onOpenLabRun(runId)} style={controlStyles.subtleButton} type="button">
            Open Lab Workspace
          </button>
        )}
      </div>

      {rows.length === 0 ? <EmptyState>No lab results.</EmptyState> : <ComparisonTable rows={rows} samples={data.samples} />}

      {data.observations.length > 0 && (
        <div style={styles.observations}>
          <strong>Observations</strong>
          {data.observations.map((observation) => (
            <div key={observation.id} style={styles.observation}>
              {sampleName(data.samples, observation.sampleId)}: {String(observation['observationText'] ?? '')}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ComparisonTable({ rows, samples }: { rows: DisplayResult[]; samples: SampleRecord[] }) {
  const comparisons = buildComparisons(rows);
  return (
    <div style={labStyles.tableWrap}>
      <table style={labStyles.table}>
        <thead>
          <tr>
            <th style={labStyles.th}>Metric</th>
            {samples.map((sample) => <th key={sample.id} style={labStyles.th}>{sample.sampleCode}</th>)}
            <th style={labStyles.th}>Unit</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((comparison) => (
            <tr key={`${comparison.category}-${comparison.metric}-${comparison.unit}`}>
              <td style={labStyles.td}><strong>{comparison.metric}</strong></td>
              {samples.map((sample) => <td key={sample.id} style={labStyles.td}>{comparison.values.get(sample.sampleCode) ?? '-'}</td>)}
              <td style={labStyles.td}>{comparison.unit || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildComparisons(rows: DisplayResult[]) {
  const comparisons = new Map<string, { category: string; metric: string; unit: string; values: Map<string, string> }>();
  rows.forEach((row) => {
    const key = `${row.category}\u0000${row.metric}\u0000${row.unit}`;
    const comparison = comparisons.get(key) ?? { category: row.category, metric: row.metric, unit: row.unit, values: new Map<string, string>() };
    const existing = comparison.values.get(row.sample);
    comparison.values.set(row.sample, existing ? `${existing} / ${formatLabValue(row.value)}` : formatLabValue(row.value));
    comparisons.set(key, comparison);
  });
  return Array.from(comparisons.values()).sort((left, right) => left.category.localeCompare(right.category) || left.metric.localeCompare(right.metric));
}

function buildRows(data: LabTestingResultsResponse): DisplayResult[] {
  const metrics = new Map(data.metrics.map((metric) => [metric.id, metric]));
  const samples = new Map(data.samples.map((sample) => [sample.id, sample]));
  const numeric = [...data.numericResults, ...data.environmentalResults]
    .map((result) => resultRow(result, metrics, samples, result['valueNumeric']));
  const subjective = data.subjectiveRatings
    .filter((result) => result.metricId && result['ratingValue'] != null)
    .map((result) => resultRow(result, metrics, samples, result['ratingValue']));
  return [...numeric, ...subjective].sort((left, right) => (
    left.sample.localeCompare(right.sample)
      || left.metric.localeCompare(right.metric)
  ));
}

function resultRow(
  result: LabResultRecord,
  metrics: Map<string, LabMetric>,
  samples: Map<string, SampleRecord>,
  value: unknown,
): DisplayResult {
  const metric = result.metricId ? metrics.get(result.metricId) : undefined;
  return {
    category: metric?.category ?? 'subjective',
    id: result.id,
    method: metric?.methodName ?? String(result['methodName'] ?? ''),
    metric: metric?.displayName ?? 'Feedback',
    sample: samples.get(result.sampleId)?.sampleCode ?? result.sampleId,
    testedAt: result['testedAt'] ?? result['ratedAt'],
    unit: String(result['unit'] ?? metric?.defaultUnit ?? ''),
    value,
  };
}

function sampleName(samples: SampleRecord[], sampleId: string): string {
  return samples.find((sample) => sample.id === sampleId)?.sampleCode ?? sampleId;
}

const styles: Record<string, CSSProperties> = {
  header: { alignItems: 'flex-start', display: 'flex', flexWrap: 'wrap', gap: spacing.space3, justifyContent: 'space-between' },
  observation: { color: colors.text.secondary, fontSize: font.size.small },
  observations: { display: 'grid', gap: spacing.space2 },
  panel: { border: `1px solid ${colors.border}`, borderRadius: radius.md, display: 'grid', gap: spacing.space4, padding: spacing.space4 },
  summary: { color: colors.text.muted, display: 'flex', flexWrap: 'wrap', fontSize: font.size.small, gap: spacing.space4 },
  title: { color: colors.text.primary, fontSize: font.size.h3, margin: 0 },
};
