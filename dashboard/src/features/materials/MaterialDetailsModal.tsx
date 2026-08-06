import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { controlStyles } from '../../components/ui/controls';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../components/ui/DataTable';
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../components/ui/Modal';
import { MessageBanner } from '../../components/ui/Page';
import { getMaterialCatalog, type MaterialCatalogDetail } from '../../services/api';
import { colors, font, spacing } from '../../theme/tokens';

export function MaterialDetailsModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<MaterialCatalogDetail | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setDetail(null);
    setError('');
    void getMaterialCatalog(id).then(setDetail).catch((reason: Error) => setError(reason.message));
  }, [id]);

  const properties = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return detail?.properties ?? [];
    return (detail?.properties ?? []).filter((item) =>
      [item.category, item.propertyName, item.testMethod, item.testCondition, item.sourceFilename]
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [detail, search]);

  return (
    <Modal ariaLabel="Material details" maxWidth={1180}>
      <ModalHeader>
        <ModalTitle>{detail ? `${detail.materialCode} — ${detail.materialName}` : 'Material Details'}</ModalTitle>
        <Button onClick={onClose} type="button" variant="secondary">Close</Button>
      </ModalHeader>
      <ModalBody>
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {!detail && !error && <div style={styles.muted}>Loading...</div>}
        {detail && (
          <div style={styles.content}>
            <div style={styles.summary}>
              <Summary label="Type" value={detail.materialType} />
              <Summary label="Chemistry" value={detail.chemistry} />
              <Summary label="Role in Blend" value={detail.roleInBlend} />
              <Summary label="Source Documents" value={detail.sourceDocuments.length} />
              <Summary label="Property Facts" value={detail.properties.length} />
              <Summary label="Processing Ranges" value={detail.processingReference.filter((item) => item.parameterKey).length} />
            </div>
            {detail.processingReference.some((item) => item.parameterKey) && (
              <div style={styles.content}>
                <h3 style={styles.heading}>Material Processing Reference</h3>
                <DataTable compact minWidth={700}>
                  <DataTableHeader>
                    <tr><DataTableHead>Parameter</DataTableHead><DataTableHead>Minimum</DataTableHead><DataTableHead>Recommended</DataTableHead><DataTableHead>Maximum</DataTableHead><DataTableHead>Unit</DataTableHead></tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {detail.processingReference.filter((item) => item.parameterKey).map((item) => (
                      <DataTableRow key={`${item.profileId}-${item.parameterKey}`}>
                        <DataTableCell>{item.displayName || item.parameterKey}</DataTableCell>
                        <DataTableCell>{item.minimumValue ?? '-'}</DataTableCell>
                        <DataTableCell>{item.recommendedValue ?? '-'}</DataTableCell>
                        <DataTableCell>{item.maximumValue ?? '-'}</DataTableCell>
                        <DataTableCell>{item.unit || '-'}</DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </div>
            )}
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Search properties, methods, conditions, or source files" style={controlStyles.input} value={search} />
            <DataTable compact minWidth={1000}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>Category</DataTableHead>
                  <DataTableHead>Property</DataTableHead>
                  <DataTableHead>Value</DataTableHead>
                  <DataTableHead>Unit</DataTableHead>
                  <DataTableHead>Method</DataTableHead>
                  <DataTableHead>Condition</DataTableHead>
                  <DataTableHead>Source</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {properties.map((item) => (
                  <DataTableRow key={item.id}>
                    <DataTableCell>{item.category}</DataTableCell>
                    <DataTableCell>{item.propertyName}</DataTableCell>
                    <DataTableCell>{formatPropertyValue(item)}</DataTableCell>
                    <DataTableCell>{item.unit || '-'}</DataTableCell>
                    <DataTableCell>{item.testMethod || '-'}</DataTableCell>
                    <DataTableCell>{item.testCondition || '-'}</DataTableCell>
                    <DataTableCell>{item.sourceFilename || '-'}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>
        )}
      </ModalBody>
      <ModalFooter><Button onClick={onClose} type="button" variant="secondary">Close</Button></ModalFooter>
    </Modal>
  );
}

function Summary({ label, value }: { label: string; value: unknown }) {
  return <div><div style={styles.label}>{label}</div><div>{value === null || value === undefined || value === '' ? '-' : String(value)}</div></div>;
}

function formatPropertyValue(item: MaterialCatalogDetail['properties'][number]) {
  const value = item.valueNumeric ?? item.valueText ?? '-';
  return item.qualifier ? `${item.qualifier} ${value}` : String(value);
}

const styles: Record<string, CSSProperties> = {
  content: { display: 'grid', gap: spacing.space4 },
  heading: { color: colors.text.primary, fontSize: font.size.h3, margin: 0 },
  label: { color: colors.text.muted, fontSize: font.size.small, marginBottom: spacing.space1 },
  muted: { color: colors.text.muted },
  summary: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' },
};
