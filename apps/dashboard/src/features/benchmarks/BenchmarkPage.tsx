import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  getBenchmark,
  listBenchmarks,
  updateBenchmarkMetric,
  validateBenchmarkWeights,
  type BenchmarkDetailDto,
  type BenchmarkItem,
  type BenchmarkMetricTarget,
  type BenchmarkWeightValidation,
} from '../../services/api';
import { colors, font, radius, spacing } from '../../theme/tokens';

export function BenchmarkPage() {
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([]);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState('');
  const [detail, setDetail] = useState<BenchmarkDetailDto | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<BenchmarkMetricTarget | null>(null);
  const [validation, setValidation] = useState<BenchmarkWeightValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void listBenchmarks()
      .then((items) => {
        setBenchmarks(items);
        setSelectedBenchmarkId(items[0]?.id ?? '');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBenchmarkId) {
      return;
    }

    setError('');

    void Promise.all([
      getBenchmark(selectedBenchmarkId),
      validateBenchmarkWeights(selectedBenchmarkId),
    ])
      .then(([benchmark, validationResult]) => {
        setDetail(benchmark);
        setSelectedMetric(benchmark.metrics[0] ?? null);
        setValidation(validationResult);
      })
      .catch((err: Error) => setError(err.message));
  }, [selectedBenchmarkId]);

  const saveMetric = async (payload: Partial<BenchmarkMetricTarget>) => {
    if (!detail || !selectedMetric) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateBenchmarkMetric(detail.id, selectedMetric.metricName, payload);
      const [updatedDetail, updatedValidation] = await Promise.all([
        getBenchmark(detail.id),
        validateBenchmarkWeights(detail.id),
      ]);

      setDetail(updatedDetail);
      setValidation(updatedValidation);
      setSelectedMetric(
        updatedDetail.metrics.find((metric) => metric.metricName === selectedMetric.metricName) ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save benchmark metric');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardPage>
      <Card>
        <h1 style={styles.title}>Benchmark Profiles</h1>
        <p style={styles.subtitle}>Lifetime and Franklin benchmark envelopes, weights, and metric targets.</p>
        <Divider />

        {loading && <div style={styles.muted}>Loading benchmark profiles...</div>}
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}

        {!loading && (
          <div style={styles.layout}>
            <aside style={styles.sidebar}>
              {benchmarks.map((benchmark) => (
                <button
                  key={benchmark.id}
                  onClick={() => setSelectedBenchmarkId(benchmark.id)}
                  style={{
                    ...styles.sidebarButton,
                    ...(selectedBenchmarkId === benchmark.id ? styles.sidebarButtonActive : {}),
                  }}
                  type="button"
                >
                  <div style={styles.sidebarTitle}>{benchmark.name}</div>
                  <div style={styles.sidebarMeta}>{benchmark.metricCount} metrics</div>
                </button>
              ))}
            </aside>

            <div style={styles.content}>
              {detail && validation && (
                <>
                  <div style={styles.validation}>
                    <div>
                      <div style={styles.label}>Weight Check</div>
                      <div style={styles.value}>{validation.message}</div>
                    </div>
                    <div>
                      <div style={styles.label}>Average Weight</div>
                      <div style={styles.value}>{validation.averageWeight.toFixed(3)}</div>
                    </div>
                    <div>
                      <div style={styles.label}>Total Weight</div>
                      <div style={styles.value}>{validation.totalWeight.toFixed(3)}</div>
                    </div>
                  </div>

                  <div style={styles.metricList}>
                    {detail.metrics.map((metric) => (
                      <button
                        key={metric.metricName}
                        onClick={() => setSelectedMetric(metric)}
                        style={{
                          ...styles.metricButton,
                          ...(selectedMetric?.metricName === metric.metricName ? styles.metricButtonActive : {}),
                        }}
                        type="button"
                      >
                        <span>{metric.metricName}</span>
                        <span>{metric.targetValue}</span>
                      </button>
                    ))}
                  </div>

                  {selectedMetric && (
                    <MetricEditor
                      key={`${detail.id}-${selectedMetric.metricName}`}
                      metric={selectedMetric}
                      saving={saving}
                      onSave={saveMetric}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </DashboardPage>
  );
}

function MetricEditor({
  metric,
  onSave,
  saving,
}: {
  metric: BenchmarkMetricTarget;
  onSave: (payload: Partial<BenchmarkMetricTarget>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    targetValue: String(metric.targetValue),
    minAcceptable: String(metric.minAcceptable ?? ''),
    maxAcceptable: String(metric.maxAcceptable ?? ''),
    standardDeviation: String(metric.standardDeviation ?? ''),
    weight: String(metric.weight),
    criticality: metric.criticality,
    unit: metric.unit ?? '',
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({
          targetValue: Number(form.targetValue),
          minAcceptable: form.minAcceptable ? Number(form.minAcceptable) : undefined,
          maxAcceptable: form.maxAcceptable ? Number(form.maxAcceptable) : undefined,
          standardDeviation: form.standardDeviation ? Number(form.standardDeviation) : undefined,
          weight: Number(form.weight),
          criticality: form.criticality,
          metricCategory: metric.metricCategory,
          unit: form.unit || undefined,
        });
      }}
      style={styles.editor}
    >
      <h2 style={styles.sectionTitle}>Edit Metric: {metric.metricName}</h2>
      <div style={styles.grid}>
        {[
          ['targetValue', 'Target Value'],
          ['minAcceptable', 'Min Acceptable'],
          ['maxAcceptable', 'Max Acceptable'],
          ['standardDeviation', 'Standard Deviation'],
          ['weight', 'Weight'],
          ['unit', 'Unit'],
        ].map(([key, label]) => (
          <label key={key} style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>{label}</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              style={controlStyles.input}
              value={form[key as keyof typeof form]}
            />
          </label>
        ))}

        <label style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>Criticality</span>
          <select
            onChange={(event) => setForm((current) => ({ ...current, criticality: event.target.value as BenchmarkMetricTarget['criticality'] }))}
            style={controlStyles.input}
            value={form.criticality}
          >
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </label>
      </div>
      <button disabled={saving} style={controlStyles.primaryButton} type="submit">
        {saving ? 'Saving...' : 'Save Metric'}
      </button>
    </form>
  );
}

const styles: Record<string, CSSProperties> = {
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  editor: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    padding: `${spacing.md}px`,
  },
  grid: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  label: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
  },
  layout: {
    display: 'grid',
    gap: spacing.md,
    gridTemplateColumns: '260px 1fr',
  },
  metricButton: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.text.primary,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    padding: `${spacing.sm}px ${spacing.md}px`,
  },
  metricButtonActive: {
    border: `1px solid ${colors.accent}`,
  },
  metricList: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  muted: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: font.size.lg,
    margin: 0,
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  sidebarButton: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.text.primary,
    cursor: 'pointer',
    padding: `${spacing.md}px`,
    textAlign: 'left',
  },
  sidebarButtonActive: {
    border: `1px solid ${colors.accent}`,
  },
  sidebarMeta: {
    color: colors.text.secondary,
    fontSize: font.size.xs,
    marginTop: 4,
  },
  sidebarTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.medium,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    margin: `${spacing.xs}px 0 0`,
  },
  title: {
    color: colors.text.primary,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    margin: 0,
  },
  validation: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    display: 'grid',
    gap: spacing.md,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    padding: `${spacing.md}px`,
  },
  value: {
    color: colors.text.primary,
    fontSize: font.size.sm,
    marginTop: 4,
  },
};
