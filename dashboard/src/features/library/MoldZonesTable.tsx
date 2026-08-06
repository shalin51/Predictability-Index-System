import type { CSSProperties } from 'react';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../components/ui/DataTable';
import { MessageBanner } from '../../components/ui/Page';
import type { LibraryRecord } from '../../services/api';
import { colors, font, spacing } from '../../theme/tokens';

export function MoldZonesTable({ error, zones }: { error: string; zones: LibraryRecord[] }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.title}>Mold Zones</h2>
      {error && <MessageBanner tone="danger">{error}</MessageBanner>}
      {!error && zones.length === 0 && <div style={styles.muted}>No mold zones configured.</div>}
      {zones.length > 0 && (
        <DataTable compact minWidth={860}>
          <DataTableHeader>
            <tr>
              <DataTableHead>Zone</DataTableHead>
              <DataTableHead>Name</DataTableHead>
              <DataTableHead>Type</DataTableHead>
              <DataTableHead>Minimum</DataTableHead>
              <DataTableHead>Maximum</DataTableHead>
              <DataTableHead>Unit</DataTableHead>
              <DataTableHead>Notes</DataTableHead>
              <DataTableHead>Status</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {zones.map((zone) => (
              <DataTableRow key={zone.id}>
                <DataTableCell>{formatValue(zone['zoneNumber'])}</DataTableCell>
                <DataTableCell>{formatValue(zone['zoneName'])}</DataTableCell>
                <DataTableCell>{formatValue(zone['zoneType'])}</DataTableCell>
                <DataTableCell>{formatValue(zone['minimumTemperature'])}</DataTableCell>
                <DataTableCell>{formatValue(zone['maximumTemperature'])}</DataTableCell>
                <DataTableCell>{formatValue(zone['temperatureUnit'])}</DataTableCell>
                <DataTableCell>{formatValue(zone['notes'])}</DataTableCell>
                <DataTableCell>{formatValue(zone['status'])}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </section>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

const styles: Record<string, CSSProperties> = {
  muted: { color: colors.text.muted },
  section: { display: 'grid', gap: spacing.space3, marginTop: spacing.space5, minWidth: 0, overflow: 'auto' },
  title: { color: colors.text.primary, fontSize: font.size.h2, margin: 0 },
};
