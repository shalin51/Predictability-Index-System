import { useEffect, useMemo, useState } from 'react';
import { controlStyles } from '../../components/ui/controls';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../components/ui/DataTable';
import { MessageBanner } from '../../components/ui/Page';
import {
  createLibraryRecord,
  updateLibraryRecord,
  type LibraryRecord,
} from '../../services/api';
import { spacing } from '../../theme/tokens';
import { LAB_TEST_METRIC_KEYS } from '@amfpi/shared';

export function BenchmarkPropertiesEditor({
  benchmarkProfileId,
  onSaved,
  options,
  properties,
}: {
  benchmarkProfileId: string;
  onSaved: (property: LibraryRecord, isNew: boolean) => void;
  options: Record<string, LibraryRecord[]>;
  properties: LibraryRecord[];
}) {
  const [error, setError] = useState('');
  const [savingMetricId, setSavingMetricId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const metrics = useMemo(() => {
    const byKey = new Map((options.metrics ?? []).map((metric) => [String(metric.code), metric]));
    return LAB_TEST_METRIC_KEYS.map((key) => byKey.get(key)).filter((metric): metric is LibraryRecord => Boolean(metric));
  }, [options.metrics]);

  useEffect(() => {
    setValues(Object.fromEntries(properties.map((property) => [String(property.metricId), formatValue(property.targetMean)])));
  }, [properties]);

  const save = async (metric: LibraryRecord) => {
    const metricId = String(metric.id);
    const property = properties.find((item) => item.metricId === metricId);
    const value = values[metricId] ?? '';
    if (value === formatValue(property?.targetMean)) return;

    setSavingMetricId(metricId);
    setError('');
    try {
      const targetMean = value === '' ? null : Number(value);
      const saved = property
        ? await updateLibraryRecord('scoring-rules', property.id, { targetMean })
        : await createLibraryRecord('scoring-rules', { benchmarkProfileId, metricId, targetMean });
      onSaved(saved, !property);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save benchmark property');
    } finally {
      setSavingMetricId('');
    }
  };

  return (
    <section style={{ display: 'grid', gap: spacing.space4 }}>
      <h2 style={{ margin: 0 }}>Benchmark Properties</h2>
      <div>All properties use the shared Lab Testing definitions. Values save automatically after editing.</div>
      {error && <MessageBanner tone="danger">{error}</MessageBanner>}
      <DataTable compact minWidth={560}>
        <DataTableHeader>
          <tr>
            <DataTableHead>Property</DataTableHead>
            <DataTableHead>Value</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {metrics.map((metric) => {
            const metricId = String(metric.id);
            const saving = savingMetricId === metricId;
            return (
              <DataTableRow key={metricId}>
                <DataTableCell>{String(metric.label ?? metric.code)}</DataTableCell>
                <DataTableCell>
                  <input
                    disabled={saving}
                    inputMode="decimal"
                    onBlur={() => void save(metric)}
                    onChange={(event) => setValues((current) => ({ ...current, [metricId]: event.target.value }))}
                    style={controlStyles.input}
                    type="number"
                    value={values[metricId] ?? ''}
                  />
                  {saving && ' Saving…'}
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </section>
  );
}

function formatValue(value: unknown): string {
  return value === null || value === undefined || value === '' ? '' : String(value);
}
