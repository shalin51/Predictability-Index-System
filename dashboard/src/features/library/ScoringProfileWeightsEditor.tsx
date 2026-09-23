import { useEffect, useMemo, useState } from 'react';
import { controlStyles } from '../../components/ui/controls';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../components/ui/DataTable';
import { MessageBanner } from '../../components/ui/Page';
import { updateLibraryRecord, type LibraryRecord } from '../../services/api';
import { spacing } from '../../theme/tokens';

import { LAB_TEST_METRIC_KEYS } from '@amfpi/shared';

export function ScoringProfileWeightsEditor({ onSaved, options, weights }: { onSaved: (weight: LibraryRecord) => void; options: Record<string, LibraryRecord[]>; weights: LibraryRecord[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const metrics = useMemo(() => {
    const byKey = new Map((options.metrics ?? []).map((metric) => [String(metric.code), metric]));
    return LAB_TEST_METRIC_KEYS.map((key) => byKey.get(key)).filter((metric): metric is LibraryRecord => Boolean(metric));
  }, [options.metrics]);

  useEffect(() => setValues(Object.fromEntries(weights.map((weight) => [String(weight.metricId), String(weight.weight ?? '')]))), [weights]);

  const save = async (metricId: string) => {
    const row = weights.find((weight) => String(weight.metricId) === metricId);
    const value = values[metricId] ?? '';
    if (!row || value === String(row.weight ?? '')) return;
    setSaving(metricId); setError('');
    try { onSaved(await updateLibraryRecord('scoring-profile-weights', row.id, { weight: value === '' ? 0 : Number(value) })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save weight'); }
    finally { setSaving(''); }
  };

  return <section style={{ display: 'grid', gap: spacing.space4 }}>
    <h2 style={{ margin: 0 }}>Scoring Weights</h2>
    <div>Enter each weight as a percentage. Weights save automatically after editing.</div>
    {error && <MessageBanner tone="danger">{error}</MessageBanner>}
    <DataTable compact minWidth={560}><DataTableHeader><tr><DataTableHead>Property</DataTableHead><DataTableHead>Weight (%)</DataTableHead></tr></DataTableHeader><DataTableBody>
      {metrics.map((metric) => { const metricId = String(metric.id); return <DataTableRow key={metricId}><DataTableCell>{String(metric.label ?? metric.code)}</DataTableCell><DataTableCell><input disabled={saving === metricId} inputMode="decimal" onBlur={() => void save(metricId)} onChange={(event) => setValues((current) => ({ ...current, [metricId]: event.target.value }))} style={controlStyles.input} type="number" value={values[metricId] ?? ''} />{saving === metricId && ' Saving…'}</DataTableCell></DataTableRow>; })}
    </DataTableBody></DataTable>
  </section>;
}
