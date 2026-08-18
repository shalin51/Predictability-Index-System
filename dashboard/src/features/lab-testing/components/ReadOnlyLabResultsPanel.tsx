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
import { formatLabValue, LAB_RESULT_CATEGORIES, labStyles } from '../labTestingUi';
import { LabResultCategoryAccordion } from './LabResultCategoryAccordion';

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
  const categorySections = useMemo(() => groupRowsByCategory(rows).map(([category, categoryRows]) => ({
    content: <ResultTable rows={categoryRows} />,
    count: categoryRows.length,
    id: category,
    label: categoryLabel(category),
  })), [rows]);

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

      {rows.length === 0 ? <EmptyState>No lab results.</EmptyState> : <LabResultCategoryAccordion sections={categorySections} />}

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

function ResultTable({ rows }: { rows: DisplayResult[] }) {
  return (
    <div style={labStyles.tableWrap}>
      <table style={labStyles.table}>
        <thead>
          <tr>
            {['Sample', 'Metric', 'Value', 'Unit', 'Method', 'Tested At'].map((column) => (
              <th key={column} style={labStyles.th}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={labStyles.td}>{row.sample}</td>
              <td style={labStyles.td}>{row.metric}</td>
              <td style={labStyles.td}>{formatLabValue(row.value)}</td>
              <td style={labStyles.td}>{row.unit || '-'}</td>
              <td style={labStyles.td}>{row.method || '-'}</td>
              <td style={labStyles.td}>{formatLabValue(row.testedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function groupRowsByCategory(rows: DisplayResult[]): Array<[string, DisplayResult[]]> {
  const groups = new Map<string, DisplayResult[]>();
  rows.forEach((row) => groups.set(row.category, [...(groups.get(row.category) ?? []), row]));
  const order = new Map<string, number>(LAB_RESULT_CATEGORIES.map((category, index) => [category.id, index]));
  return Array.from(groups.entries()).sort(([left], [right]) => (
    (order.get(left) ?? Number.MAX_SAFE_INTEGER) - (order.get(right) ?? Number.MAX_SAFE_INTEGER)
      || left.localeCompare(right)
  ));
}

function categoryLabel(category: string): string {
  return LAB_RESULT_CATEGORIES.find((item) => item.id === category)?.label
    ?? category.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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
      || left.category.localeCompare(right.category)
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
