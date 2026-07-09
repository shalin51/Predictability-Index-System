import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardSubtitle, CardTitle, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../components/ui/DataTable';
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../components/ui/Modal';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  archiveLibraryRecord,
  createLibraryRecord,
  listLibraryOptions,
  listLibraryRecords,
  updateLibraryRecord,
  validateLibraryScoringWeights,
  type LibraryFieldDefinition,
  type LibraryRecord,
} from '../../services/api';
import { colors, font, radius, spacing } from '../../theme/tokens';

const sections = [
  'materials',
  'suppliers',
  'supplier-materials',
  'material-lots',
  'machines',
  'molds',
  'metrics',
  'test-methods',
  'test-conditions',
  'benchmarks',
  'scoring-rules',
] as const;

const columns: Record<string, string[]> = {
  benchmarks: ['benchmarkCode', 'benchmarkName', 'profileVersion', 'ballBrand', 'ballModel', 'status'],
  machines: ['machineCode', 'machineName', 'location', 'status', 'updatedAt'],
  materials: ['materialCode', 'materialName', 'materialType', 'defaultUnit', 'status', 'updatedAt'],
  'material-lots': ['materialCode', 'supplierName', 'lotNumber', 'receivedDate', 'expirationDate', 'status'],
  metrics: ['metricKey', 'displayName', 'category', 'defaultUnit', 'dataType', 'benchmarkComparable', 'requiredForScoring', 'status'],
  molds: ['moldCode', 'moldName', 'moldType', 'cavityCount', 'status'],
  'scoring-rules': ['benchmarkCode', 'metricKey', 'targetMean', 'minAcceptable', 'maxAcceptable', 'targetStdDev', 'weight', 'criticality'],
  suppliers: ['supplierName', 'supplierType', 'contactInfo', 'status', 'updatedAt'],
  'supplier-materials': ['supplierName', 'materialCode', 'materialName', 'supplierMaterialCode', 'status'],
  'test-conditions': ['conditionCode', 'conditionName', 'description', 'status'],
  'test-methods': ['methodCode', 'methodName', 'metricKey', 'cureHours', 'status'],
};

const enumOptions: Record<string, string[]> = {
  category: ['physical', 'performance', 'durability', 'environmental', 'subjective'],
  criticality: ['low', 'medium', 'high', 'critical'],
  dataType: ['numeric', 'text', 'boolean', 'rating'],
  status: ['active', 'inactive', 'archived'],
};

const optionResourceByField: Record<string, string> = {
  benchmarkProfileId: 'benchmarks',
  materialId: 'materials',
  metricId: 'metrics',
  supplierId: 'suppliers',
  supplierMaterialId: 'supplier-materials',
};

export function LibraryPage({
  activeSection,
  onSectionChange,
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
}) {
  const section = sections.includes(activeSection as never) ? activeSection : 'materials';
  const [records, setRecords] = useState<LibraryRecord[]>([]);
  const [fields, setFields] = useState<LibraryFieldDefinition[]>([]);
  const [options, setOptions] = useState<Record<string, LibraryRecord[]>>({});
  const [editing, setEditing] = useState<LibraryRecord | null>(null);
  const [selected, setSelected] = useState<LibraryRecord | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    void listLibraryRecords(section, { search, status })
      .then((response) => {
        setRecords(response.data);
        setFields(response.fields);
        setSelected(response.data[0] ?? null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [section, search, status]);

  useEffect(() => {
    void Promise.all(['benchmarks', 'materials', 'metrics', 'suppliers', 'supplier-materials'].map((resource) =>
      listLibraryOptions(resource).then((items) => [resource, items] as const)
    )).then((entries) => setOptions(Object.fromEntries(entries))).catch(() => undefined);
  }, []);

  const startEdit = (record?: LibraryRecord) => {
    setEditing(record ?? { id: '' });
    setForm(record ?? Object.fromEntries(fields.map((field) => [field.key, field.type === 'boolean' ? false : field.key === 'status' ? 'active' : ''])));
  };

  const save = async () => {
    try {
      const payload = coercePayload(fields, form);
      if (editing?.id) await updateLibraryRecord(section, editing.id, payload);
      else await createLibraryRecord(section, payload);
      setEditing(null);
      setMessage('Saved');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const validateWeights = async () => {
    const benchmarkId = String(selected?.['benchmarkProfileId'] ?? '');
    if (!benchmarkId) return;
    const result = await validateLibraryScoringWeights(benchmarkId);
    setMessage(result.message);
  };

  return (
    <DashboardPage maxWidth="100%">
      <div style={styles.layout}>
        <aside className="library-page__nav" style={styles.nav}>
          {sections.map((item) => (
            <button
              aria-current={item === section ? 'page' : undefined}
              className={`library-page__nav-button${item === section ? ' library-page__nav-button--active' : ''}`}
              key={item}
              onClick={() => onSectionChange(item)}
              type="button"
            >
              {labelize(item)}
            </button>
          ))}
        </aside>
        <Card style={styles.card}>
          <CardHeader>
            <div>
              <CardTitle>{labelize(section)}</CardTitle>
              <CardSubtitle>Controlled Library records for dropdowns, benchmarks, and scoring.</CardSubtitle>
            </div>
            <div style={styles.headerActions}>
              {section === 'scoring-rules' && (
                <Button
                  disabled={!selected}
                  onClick={() => void validateWeights()}
                  variant="secondary"
                  type="button"
                >
                  Validate Selected Benchmark
                </Button>
              )}
              <Button onClick={() => startEdit()} type="button" variant="primary">New</Button>
            </div>
          </CardHeader>
          <Divider />
          <div style={styles.filters}>
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Search" style={controlStyles.input} value={search} />
            <select onChange={(event) => setStatus(event.target.value)} style={controlStyles.input} value={status}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>
          {error && <MessageBanner tone="danger">{error}</MessageBanner>}
          {message && <MessageBanner tone="success">{message}</MessageBanner>}
          {loading && <div style={styles.muted}>Loading...</div>}
          {!loading && records.length === 0 && <EmptyState>No records.</EmptyState>}
          {records.length > 0 && (
            <div style={styles.tableWrap}>
              <DataTable minWidth={900} selectableRows>
                <DataTableHeader>
                  <tr>
                    {(columns[section] ?? []).map((column) => <DataTableHead key={column}>{labelize(column)}</DataTableHead>)}
                    <DataTableHead>Actions</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {records.map((record) => {
                    const isSelected = selected?.id === record.id;
                    return (
                      <DataTableRow key={record.id} onClick={() => setSelected(record)} selected={isSelected}>
                        {(columns[section] ?? []).map((column) => (
                          <DataTableCell key={column}>
                            {formatValue(record[column])}
                          </DataTableCell>
                        ))}
                        <DataTableCell>
                          <div style={styles.rowActions}>
                            <Button onClick={(event) => { event.stopPropagation(); startEdit(record); }} size="sm" type="button" variant="subtle">Edit</Button>
                            <Button onClick={(event) => { event.stopPropagation(); void archiveLibraryRecord(section, record.id).then(load); }} size="sm" type="button" variant="subtle">Archive</Button>
                          </div>
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              </DataTable>
            </div>
          )}
        </Card>
      </div>
      {editing && (
        <Modal ariaLabel={`${editing.id ? 'Edit' : 'Create'} ${labelize(section)}`}>
          <ModalHeader>
            <ModalTitle>{editing.id ? 'Edit' : 'Create'} {labelize(section)}</ModalTitle>
            <Button onClick={() => setEditing(null)} type="button" variant="secondary">Close</Button>
          </ModalHeader>
          <ModalBody>
            <div style={styles.form}>
              {fields.map((field) => (
                <label key={field.key} style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>{field.label}</span>
                  <Field field={field} onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))} options={options[optionResourceByField[field.key] ?? ''] ?? []} value={form[field.key]} />
                </label>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setEditing(null)} type="button" variant="secondary">Cancel</Button>
            <Button onClick={() => void save()} type="button" variant="primary">Save</Button>
          </ModalFooter>
        </Modal>
      )}
    </DashboardPage>
  );
}

function Field({ field, onChange, options, value }: { field: LibraryFieldDefinition; onChange: (value: unknown) => void; options: LibraryRecord[]; value: unknown }) {
  if (field.type === 'textarea') return <textarea onChange={(event) => onChange(event.target.value)} style={controlStyles.textarea} value={String(value ?? '')} />;
  if (field.type === 'boolean') return <input checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} type="checkbox" />;
  if (field.type === 'select') {
    return (
      <select onChange={(event) => onChange(event.target.value)} style={controlStyles.input} value={String(value ?? '')}>
        <option value="">Select</option>
        {(enumOptions[field.key] ?? []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
        {options.map((item) => <option key={item.id} value={item.id}>{String(item['label'] ?? item['code'] ?? item.id)}</option>)}
      </select>
    );
  }
  return <input onChange={(event) => onChange(event.target.value)} style={controlStyles.input} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={String(value ?? '')} />;
}

function coercePayload(fields: LibraryFieldDefinition[], form: Record<string, unknown>) {
  return Object.fromEntries(fields.map((field) => [field.key, field.type === 'number' && form[field.key] !== '' ? Number(form[field.key]) : form[field.key]]));
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && value.includes('T')) return value.slice(0, 10);
  return String(value);
}

function labelize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles: Record<string, CSSProperties> = {
  actions: { display: 'flex', gap: spacing.space3, justifyContent: 'flex-end' },
  card: { height: '100%', minHeight: 0, overflow: 'hidden' },
  filters: { display: 'flex', gap: spacing.space3, marginBottom: spacing.space4 },
  form: { display: 'grid', gap: spacing.space4, margin: `${spacing.space5}px 0` },
  headerActions: { display: 'flex', gap: spacing.space3 },
  layout: { display: 'grid', gap: spacing.space5, gridTemplateColumns: '220px minmax(0, 1fr)', height: '100%', minHeight: 0, overflow: 'hidden' },
  muted: { color: colors.text.muted, fontSize: font.size.small },
  nav: { alignSelf: 'start', border: `1px solid ${colors.border}`, borderRadius: radius.md, display: 'grid', gap: 2, padding: spacing.space3 },
  rowActions: { display: 'flex', flexWrap: 'wrap', gap: spacing.space2 },
  tableWrap: { border: `1px solid ${colors.border}`, borderRadius: radius.md, minHeight: 0, overflow: 'auto' },
};
