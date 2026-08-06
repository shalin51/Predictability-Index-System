import type { CSSProperties } from 'react';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../components/ui/DataTable';
import { MessageBanner } from '../../components/ui/Page';
import type { LibraryRecord } from '../../services/api';
import { colors, font, spacing } from '../../theme/tokens';

export function RelatedMaterialsTable({ error, materials }: { error: string; materials: LibraryRecord[] }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.title}>Related Materials</h2>
      {error && <MessageBanner tone="danger">{error}</MessageBanner>}
      {!error && materials.length === 0 && <div style={styles.muted}>No materials are assigned to this supplier.</div>}
      {materials.length > 0 && (
        <DataTable compact minWidth={800}>
          <DataTableHeader>
            <tr>
              <DataTableHead>Material ID</DataTableHead>
              <DataTableHead>Material Name</DataTableHead>
              <DataTableHead>Product Grade</DataTableHead>
              <DataTableHead>Chemistry</DataTableHead>
              <DataTableHead>Role in Blend</DataTableHead>
              <DataTableHead>Status</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {materials.map((material) => (
              <DataTableRow key={material.id}>
                <DataTableCell><a href={`/materials/${encodeURIComponent(material.id)}`} style={styles.link}>{formatValue(material['materialCode'])}</a></DataTableCell>
                <DataTableCell>{formatValue(material['materialName'])}</DataTableCell>
                <DataTableCell>{formatValue(material['productGrade'])}</DataTableCell>
                <DataTableCell>{formatValue(material['chemistry'])}</DataTableCell>
                <DataTableCell>{formatValue(material['roleInBlend'])}</DataTableCell>
                <DataTableCell>{formatValue(material['status'])}</DataTableCell>
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
  link: { color: colors.text.primary, fontWeight: font.weight.semibold },
  muted: { color: colors.text.muted },
  section: { display: 'grid', gap: spacing.space3, marginTop: spacing.space5, minWidth: 0, overflow: 'auto' },
  title: { color: colors.text.primary, fontSize: font.size.h2, margin: 0 },
};
