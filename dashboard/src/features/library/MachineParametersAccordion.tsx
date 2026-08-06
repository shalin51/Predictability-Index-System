import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../components/ui/DataTable';
import type { LibraryRecord } from '../../services/api';
import { colors, font, radius, spacing } from '../../theme/tokens';
import { labelize } from './LibrarySectionNav';

export function MachineParametersAccordion({ parameters }: { parameters: LibraryRecord[] }) {
  const sections = useMemo(() => groupBySection(parameters), [parameters]);

  if (sections.length === 0) {
    return <div style={styles.empty}>No machine parameters configured.</div>;
  }

  return (
    <div style={styles.sections}>
      {sections.map(([sectionKey, items], index) => (
        <details key={sectionKey} open={index === 0} style={styles.accordion}>
          <summary style={styles.summary}>
            <span>{labelize(sectionKey)}</span>
            <span style={styles.count}>{items.length} {items.length === 1 ? 'parameter' : 'parameters'}</span>
          </summary>
          <div style={styles.table}>
            <DataTable compact minWidth={760}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>Parameter</DataTableHead>
                  <DataTableHead>Position</DataTableHead>
                  <DataTableHead>Minimum</DataTableHead>
                  <DataTableHead>Maximum</DataTableHead>
                  <DataTableHead>Unit</DataTableHead>
                  <DataTableHead>Notes</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {items.map((parameter) => (
                  <DataTableRow key={parameter.id}>
                    <DataTableCell>{formatValue(parameter['displayName'])}</DataTableCell>
                    <DataTableCell>{formatPosition(parameter)}</DataTableCell>
                    <DataTableCell>{formatValue(parameter['minimumValue'])}</DataTableCell>
                    <DataTableCell>{formatValue(parameter['maximumValue'])}</DataTableCell>
                    <DataTableCell>{formatValue(parameter['unit'])}</DataTableCell>
                    <DataTableCell>{formatValue(parameter['notes'])}</DataTableCell>
                    <DataTableCell>{formatValue(parameter['status'])}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>
        </details>
      ))}
    </div>
  );
}

function groupBySection(parameters: LibraryRecord[]): Array<[string, LibraryRecord[]]> {
  const groups = new Map<string, LibraryRecord[]>();
  parameters.forEach((parameter) => {
    const sectionKey = String(parameter['sectionKey'] || 'other');
    groups.set(sectionKey, [...(groups.get(sectionKey) ?? []), parameter]);
  });
  return Array.from(groups.entries());
}

function formatPosition(parameter: LibraryRecord) {
  const label = parameter['positionLabel'];
  if (label !== null && label !== undefined && label !== '') return String(label);
  const type = parameter['positionType'];
  const index = parameter['positionIndex'];
  if (type && index !== null && index !== undefined && index !== '') return `${labelize(String(type))} ${String(index)}`;
  return type ? labelize(String(type)) : '-';
}

function formatValue(value: unknown) {
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

const styles: Record<string, CSSProperties> = {
  accordion: { border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: 'hidden' },
  count: { color: colors.text.muted, fontSize: font.size.small, fontWeight: font.weight.normal },
  empty: { color: colors.text.muted, padding: `${spacing.space3}px 0` },
  sections: { display: 'grid', gap: spacing.space3 },
  summary: {
    alignItems: 'center',
    background: colors.surfaceMuted,
    color: colors.text.primary,
    cursor: 'pointer',
    display: 'flex',
    fontWeight: font.weight.semibold,
    gap: spacing.space3,
    justifyContent: 'space-between',
    padding: `${spacing.space3}px ${spacing.space4}px`,
  },
  table: { borderTop: `1px solid ${colors.border}`, minWidth: 0, overflow: 'auto' },
};
