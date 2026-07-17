import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card, Divider } from '../../../components/ui/Card';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../../components/ui/DataTable';
import { EmptyState, MessageBanner } from '../../../components/ui/Page';
import { getProductionRunProcessSetup, type ProcessSetupDetail } from '../../../services/api';
import { colors, spacing } from '../../../theme/tokens';
import { formatValue, runStyles } from '../productionRunUi';

export function ProcessSetupPanel({ runId }: { runId: string }) {
  const [record, setRecord] = useState<ProcessSetupDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { void getProductionRunProcessSetup(runId).then(setRecord).catch((caught: Error) => setError(caught.message)); }, [runId]);
  const sections = useMemo(() => groupBy(record?.values ?? [], 'section'), [record]);
  if (error) return <MessageBanner tone="danger">{error}</MessageBanner>;
  if (!record) return <div style={runStyles.muted}>Loading process setup…</div>;
  if (!record.processSetupRevisionId) return <EmptyState>This run has no imported process setup.</EmptyState>;
  return (
    <div style={runStyles.stack}>
      <div style={styles.summary}>
        <div style={runStyles.panel}>Revision<br /><strong>{formatValue(record.revisionNo)}</strong></div>
        <div style={runStyles.panel}>Approved By<br /><strong>{formatValue(record.approvedBy)}</strong></div>
        <div style={runStyles.panel}>Source File<br /><strong>{formatValue(record.sourceFilename)}</strong></div>
        <div style={runStyles.panel}>SHA-256<br /><strong style={styles.hash}>{formatValue(record.sourceSha256)}</strong></div>
      </div>
      {Object.entries(sections).map(([section, values]) => (
        <Card key={section}>
          <h3 style={styles.heading}>{label(section)}</h3><Divider />
          <DataTable minWidth={900}>
            <DataTableHeader><tr><DataTableHead>Parameter</DataTableHead><DataTableHead>Position</DataTableHead><DataTableHead>Setpoint</DataTableHead><DataTableHead>Actual</DataTableHead><DataTableHead>Unit</DataTableHead><DataTableHead>Tolerance</DataTableHead><DataTableHead>Status</DataTableHead><DataTableHead>Notes</DataTableHead></tr></DataTableHeader>
            <DataTableBody>{values.map((value) => { const exception = toleranceException(value); return <DataTableRow key={String(value['id'])}><DataTableCell>{formatValue(value['displayName'])}</DataTableCell><DataTableCell>{formatValue(value['positionLabel'] ?? value['positionIndex'])}</DataTableCell><DataTableCell>{typed(value, 'setpoint')}</DataTableCell><DataTableCell>{typed(value, 'actual')}</DataTableCell><DataTableCell>{formatValue(value['unit'])}</DataTableCell><DataTableCell>{range(value)}</DataTableCell><DataTableCell><span style={exception ? styles.exception : styles.ok}>{exception ? 'Out of tolerance' : 'Within / n.a.'}</span></DataTableCell><DataTableCell>{formatValue(value['notes'])}</DataTableCell></DataTableRow>; })}</DataTableBody>
          </DataTable>
        </Card>
      ))}
      {(record.notes?.length ?? 0) > 0 && <Card><h3 style={styles.heading}>Operator Notes</h3><Divider />{record.notes?.map((note, index) => <p key={index}><strong>{label(String(note['noteType']))}:</strong> {formatValue(note['noteText'])}</p>)}</Card>}
      {(record.materialProfile?.length ?? 0) > 0 && <Card><h3 style={styles.heading}>Material Processing Profile</h3><Divider /><div style={styles.summary}><div style={runStyles.panel}>Trade Name<br /><strong>{formatValue(record.materialProfile?.[0]?.['trade_name'])}</strong></div><div style={runStyles.panel}>Manufacturer<br /><strong>{formatValue(record.materialProfile?.[0]?.['manufacturer'])}</strong></div><div style={runStyles.panel}>Grade<br /><strong>{formatValue(record.materialProfile?.[0]?.['grade'])}</strong></div><div style={runStyles.panel}>Color / Pigment<br /><strong>{formatValue(record.materialProfile?.[0]?.['color_pigment'])}</strong></div></div>{record.materialProfile?.filter((range) => range['parameterKey']).map((range, index) => <div key={index} style={runStyles.panel}>{formatValue(range['rangeDisplayName'])}: {formatValue(range['minValue'])} – {formatValue(range['maxValue'])}; recommended {formatValue(range['recommendedValue'])} {formatValue(range['rangeUnit'])}</div>)}</Card>}
      {(record.dryingEvents?.length ?? 0) > 0 && <Card><h3 style={styles.heading}>Material Drying</h3><Divider />{record.dryingEvents?.map((event, index) => <div key={index} style={runStyles.panel}>Dryer {formatValue(event['dryerCode'])}: setpoint {formatValue(event['setpointTemperature'])}, actual {formatValue(event['actualTemperature'])} {formatValue(event['temperatureUnit'])}; {formatValue(event['startedAt'])} to {formatValue(event['endedAt'])} ({formatValue(event['durationHours'])} hours); approved by {formatValue(event['approvedBy'])}</div>)}</Card>}
      {(record.revisionHistory?.length ?? 0) > 0 && <Card><h3 style={styles.heading}>Workbook Revision History</h3><Divider />{record.revisionHistory?.map((entry, index) => <div key={index} style={runStyles.panel}>Rev {formatValue(entry['revisionNo'])} — {formatValue(entry['revisionDate'])} — {formatValue(entry['description'])}</div>)}</Card>}
    </div>
  );
}

function groupBy(items: Array<Record<string, unknown>>, key: string): Record<string, Array<Record<string, unknown>>> { return items.reduce<Record<string, Array<Record<string, unknown>>>>((groups, item) => { const group = String(item[key] ?? 'other'); (groups[group] ??= []).push(item); return groups; }, {}); }
function typed(value: Record<string, unknown>, prefix: 'setpoint' | 'actual'): string { return formatValue(value[`${prefix}Numeric`] ?? value[`${prefix}Text`] ?? value[`${prefix}Date`]); }
function range(value: Record<string, unknown>): string { const min = value['toleranceMin']; const max = value['toleranceMax']; return min == null && max == null ? '-' : `${formatValue(min)} – ${formatValue(max)}`; }
function toleranceException(value: Record<string, unknown>): boolean { const actual = Number(value['actualNumeric']); const min = value['toleranceMin']; const max = value['toleranceMax']; if (!Number.isFinite(actual) || value['actualNumeric'] == null) return false; return (min != null && actual < Number(min)) || (max != null && actual > Number(max)); }
function label(value: string): string { return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
const styles: Record<string, CSSProperties> = { exception: { color: colors.status.error, fontWeight: 700 }, hash: { display: 'block', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }, heading: { color: colors.text.primary, margin: 0 }, ok: { color: colors.text.muted }, summary: { display: 'grid', gap: spacing.space3, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } };
