import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardSubtitle, CardTitle, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../components/ui/DataTable';
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../components/ui/Modal';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  createLibraryRecord,
  listLibraryOptions,
  listLibraryRecords,
  listProcessSetups,
  updateLibraryRecord,
  validateLibraryScoringWeights,
  type LibraryFieldDefinition,
  type LibraryRecord,
} from '../../services/api';
import { colors, font, radius, spacing } from '../../theme/tokens';
import { MaterialDetailsModal } from '../materials/MaterialDetailsModal';

const sections = [
  'materials',
  'material-properties',
  'material-suppliers',
  'machines',
  'machine-parameters',
  'molds',
  'mold-zones',
  'metrics',
  'test-methods',
  'test-conditions',
  'benchmarks',
  'scoring-rules',
  'process-setups',
] as const;

const columns: Record<string, string[]> = {
  benchmarks: ['benchmarkCode', 'benchmarkName', 'profileVersion', 'ballBrand', 'ballModel', 'status'],
  machines: ['machineCode', 'machineName', 'manufacturer', 'machineType', 'modelNumber', 'location', 'status'],
  'machine-parameters': ['machineCode', 'displayName', 'sectionKey', 'positionLabel', 'minimumValue', 'maximumValue', 'unit', 'status'],
  materials: ['materialCode', 'materialName', 'materialSupplierCode', 'materialLot', 'productGrade', 'chemistry', 'roleInBlend', 'sourceRevisionDate', 'status'],
  'material-properties': ['materialId', 'productGrade', 'propertyId', 'propertyName', 'valueNumeric', 'valueText', 'qualifier', 'unit', 'testMethod', 'testCondition'],
  'material-suppliers': ['supplierCode', 'supplierName', 'supplierRole', 'contactName', 'contactEmail', 'contactPhone', 'status'],
  metrics: ['metricKey', 'displayName', 'category', 'defaultUnit', 'dataType', 'benchmarkComparable', 'requiredForScoring', 'status'],
  molds: ['moldCode', 'moldName', 'moldType', 'manufacturer', 'cavityCount', 'zoneCount', 'status'],
  'mold-zones': ['moldCode', 'zoneNumber', 'zoneName', 'zoneType', 'minimumTemperature', 'maximumTemperature', 'temperatureUnit', 'status'],
  'scoring-rules': ['benchmarkCode', 'metricKey', 'targetMean', 'minAcceptable', 'maxAcceptable', 'targetStdDev', 'weight', 'criticality'],
  suppliers: ['supplierName', 'supplierType', 'contactName', 'contactEmail', 'contactPhone', 'status'],
  'test-conditions': ['conditionCode', 'conditionName', 'description', 'status'],
  'test-methods': ['methodCode', 'methodName', 'metricKey', 'cureHours', 'status'],
  'process-setups': ['machine', 'mold', 'formulation', 'revisionNo', 'status', 'approvedBy', 'approvedAt', 'parameterCount'],
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
  materialSupplierId: 'material-suppliers',
  machineId: 'machines',
  metricId: 'metrics',
  moldId: 'molds',
  supplierId: 'suppliers',
};

export function LibraryPage({
  activeSection,
  onSectionChange,
  onImport,
  sectionOptions,
  standalone = false,
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onImport?: () => void;
  sectionOptions?: readonly string[];
  standalone?: boolean;
}) {
  const section = sections.includes(activeSection as never) ? activeSection : 'materials';
  const readOnly = section === 'material-properties';
  const visibleSections = sectionOptions?.filter((item) => sections.includes(item as never)) ?? sections;
  const showSectionNav = visibleSections.length > 1;
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
  const [materialDetailId, setMaterialDetailId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    if (section === 'process-setups') {
      void listProcessSetups()
        .then((items) => { setRecords(items); setFields([]); setSelected(items[0] ?? null); })
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
      return;
    }
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
    void Promise.all(['benchmarks', 'machines', 'materials', 'material-suppliers', 'metrics', 'molds'].map((resource) =>
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
      <div style={{ ...styles.layout, ...(!showSectionNav ? styles.layoutStandalone : {}) }}>
        {showSectionNav && <aside className="library-page__nav" style={styles.nav}>
          {visibleSections.map((item) => (
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
        </aside>}
        <Card style={styles.card}>
          <CardHeader>
            <div>
              <CardTitle>{labelize(section)}</CardTitle>
              <CardSubtitle>{standalone ? `Manage ${labelize(section).toLowerCase()} master data used by formulations and production.` : 'Controlled reference records for dropdowns, benchmarks, and scoring.'}</CardSubtitle>
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
              {section !== 'process-setups' && !readOnly && <Button onClick={() => startEdit()} type="button" variant="primary">New</Button>}
              {section === 'materials' && onImport && <Button onClick={onImport} type="button" variant="secondary">Import Materials</Button>}
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
                            {section === 'materials' && <Button onClick={(event) => { event.stopPropagation(); setMaterialDetailId(record.id); }} size="sm" type="button" variant="subtle">Details</Button>}
                            {section !== 'process-setups' && !readOnly && <Button onClick={(event) => { event.stopPropagation(); startEdit(record); }} size="sm" type="button" variant="subtle">Edit</Button>}
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
      {materialDetailId && <MaterialDetailsModal id={materialDetailId} onClose={() => setMaterialDetailId(null)} />}
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
  layoutStandalone: { gridTemplateColumns: 'minmax(0, 1fr)' },
  muted: { color: colors.text.muted, fontSize: font.size.small },
  nav: { alignSelf: 'start', border: `1px solid ${colors.border}`, borderRadius: radius.md, display: 'grid', gap: 2, padding: spacing.space3 },
  rowActions: { display: 'flex', flexWrap: 'wrap', gap: spacing.space2 },
  tableWrap: { border: `1px solid ${colors.border}`, borderRadius: radius.md, minHeight: 0, overflow: 'auto' },
};
