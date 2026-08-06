import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardSubtitle, CardTitle, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../components/ui/DataTable';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  getLibraryRecord,
  getMaterialCatalog,
  listLibraryOptions,
  updateLibraryRecord,
  type LibraryFieldDefinition,
  type LibraryRecord,
  type MaterialCatalogDetail,
} from '../../services/api';
import { colors, font, spacing } from '../../theme/tokens';
import { coerceLibraryPayload, LibraryRecordForm, libraryOptionResources } from './LibraryRecordForm';
import { labelize, LibrarySectionNav } from './LibrarySectionNav';

export function LibraryRecordDetailPage({
  id,
  initialEditing = false,
  onBack,
  onSectionChange,
  resource,
  sections,
}: {
  id: string;
  initialEditing?: boolean;
  onBack: () => void;
  onSectionChange: (section: string) => void;
  resource: string;
  sections: readonly string[];
}) {
  const [record, setRecord] = useState<LibraryRecord | null>(null);
  const [fields, setFields] = useState<LibraryFieldDefinition[]>([]);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [options, setOptions] = useState<Record<string, LibraryRecord[]>>({});
  const [editing, setEditing] = useState(initialEditing);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setRecord(null);
    setError('');
    setMessage('');
    const detailRequest = getLibraryRecord(resource, id);
    const recordRequest = resource === 'materials'
      ? getMaterialCatalog(id)
      : detailRequest.then((response) => response.data);
    const optionsRequest = Promise.all(libraryOptionResources.map((optionResource) =>
      listLibraryOptions(optionResource).then((items) => [optionResource, items] as const)
    ));
    void Promise.all([detailRequest, recordRequest, optionsRequest])
      .then(([detail, loadedRecord, optionEntries]) => {
        setFields(detail.fields);
        setForm(detail.data);
        setOptions(Object.fromEntries(optionEntries));
        setRecord(loadedRecord);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [id, resource]);

  useEffect(() => setEditing(initialEditing), [id, initialEditing]);

  const save = async () => {
    try {
      const updated = await updateLibraryRecord(resource, id, coerceLibraryPayload(fields, form));
      setForm(updated);
      setRecord(resource === 'materials' ? await getMaterialCatalog(id) : updated);
      setEditing(false);
      setMessage('Saved');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Save failed');
    }
  };

  const properties = useMemo(() => {
    if (resource !== 'materials' || !record) return [];
    const query = search.trim().toLowerCase();
    const items = (record as MaterialCatalogDetail).properties ?? [];
    if (!query) return items;
    return items.filter((item) =>
      [item.category, item.propertyName, item.testMethod, item.testCondition, item.sourceFilename]
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [record, resource, search]);

  const title = record ? getRecordTitle(record, resource) : labelize(resource);
  const details = record ? Object.entries(record).filter(([key]) => key !== 'id' && key !== 'properties') : [];

  return (
    <DashboardPage maxWidth="100%">
      <div style={styles.page}>
        <LibrarySectionNav activeSection={resource} onSectionChange={onSectionChange} sections={sections} />
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardSubtitle>{labelize(resource)} record</CardSubtitle>
            </div>
            <div style={styles.actions}>
              {record && fields.length > 0 && !editing && <Button onClick={() => setEditing(true)} type="button" variant="primary">Edit</Button>}
              <Button onClick={onBack} type="button" variant="secondary">Back to {labelize(resource)}</Button>
            </div>
          </CardHeader>
          <Divider />
          {error && <MessageBanner tone="danger">{error}</MessageBanner>}
          {message && <MessageBanner tone="success">{message}</MessageBanner>}
          {!record && !error && <div style={styles.muted}>Loading...</div>}
          {record && editing && (
            <div style={styles.editor}>
              <LibraryRecordForm
                fields={fields}
                form={form}
                onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
                options={options}
              />
              <div style={styles.actions}>
                <Button onClick={() => { setForm(record); setEditing(false); }} type="button" variant="secondary">Cancel</Button>
                <Button onClick={() => void save()} type="button" variant="primary">Save</Button>
              </div>
            </div>
          )}
          {record && !editing && (
            <>
              <div style={styles.summary}>
                {details.map(([key, value]) => (
                  <div key={key} style={styles.detail}>
                    <div style={styles.label}>{labelize(key)}</div>
                    <div>{formatValue(value)}</div>
                  </div>
                ))}
              </div>
              {resource === 'materials' && (
                <div style={styles.properties}>
                  <input
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search properties, methods, conditions, or source files"
                    style={controlStyles.input}
                    value={search}
                  />
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
                          <DataTableCell>{item.qualifier ? `${item.qualifier} ${item.valueNumeric ?? item.valueText ?? '-'}` : String(item.valueNumeric ?? item.valueText ?? '-')}</DataTableCell>
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
            </>
          )}
        </Card>
      </div>
    </DashboardPage>
  );
}

function getRecordTitle(record: LibraryRecord, resource: string) {
  const titleKeys = ['materialName', 'propertyName', 'supplierName', 'machineName', 'displayName', 'moldName', 'zoneName', 'name', 'code'];
  const value = titleKeys.map((key) => record[key]).find((item) => item !== null && item !== undefined && item !== '');
  return value ? String(value) : `${labelize(resource)} ${record.id}`;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && value.includes('T')) return value.slice(0, 10);
  return String(value);
}

const styles: Record<string, CSSProperties> = {
  actions: { display: 'flex', flexWrap: 'wrap', gap: spacing.space3, justifyContent: 'flex-end' },
  detail: { minWidth: 0 },
  editor: { display: 'grid', gap: spacing.space4, maxWidth: 760 },
  label: { color: colors.text.muted, fontSize: font.size.small, marginBottom: spacing.space1 },
  muted: { color: colors.text.muted },
  page: { display: 'flex', flexDirection: 'column', gap: spacing.space5, minHeight: '100%' },
  properties: { display: 'grid', gap: spacing.space4, minWidth: 0, overflow: 'auto' },
  summary: { display: 'grid', gap: spacing.space5, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' },
};
