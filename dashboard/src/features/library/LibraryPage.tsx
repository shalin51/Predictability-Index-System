import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
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
        <aside style={styles.nav}>
          {sections.map((item) => (
            <button key={item} onClick={() => onSectionChange(item)} style={{ ...styles.navButton, ...(item === section ? styles.navButtonActive : {}) }} type="button">
              {labelize(item)}
            </button>
          ))}
        </aside>
        <Card>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>{labelize(section)}</h1>
              <p style={styles.subtitle}>Controlled Library records for dropdowns, benchmarks, and scoring.</p>
            </div>
            <button onClick={() => startEdit()} style={controlStyles.primaryButton} type="button">New</button>
          </div>
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
            <div style={styles.grid}>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead><tr>{(columns[section] ?? []).map((column) => <th key={column} style={styles.th}>{labelize(column)}</th>)}<th style={styles.th}>Actions</th></tr></thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} onClick={() => setSelected(record)} style={styles.tr}>
                        {(columns[section] ?? []).map((column) => <td key={column} style={styles.td}>{formatValue(record[column])}</td>)}
                        <td style={styles.td}>
                          <button onClick={(event) => { event.stopPropagation(); startEdit(record); }} style={styles.linkButton} type="button">Edit</button>
                          <button onClick={(event) => { event.stopPropagation(); void archiveLibraryRecord(section, record.id).then(load); }} style={styles.linkButton} type="button">Archive</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <aside style={styles.detail}>
                <strong>Detail</strong>
                <pre style={styles.pre}>{selected ? JSON.stringify(selected, null, 2) : 'Select a record.'}</pre>
                {section === 'scoring-rules' && <button onClick={() => void validateWeights()} style={controlStyles.secondaryButton} type="button">Validate Weights</button>}
                <Divider />
                <div style={styles.muted}>Related records, usage history, and audit trail placeholders.</div>
              </aside>
            </div>
          )}
        </Card>
      </div>
      {editing && (
        <div style={styles.drawer}>
          <div style={styles.drawerPanel}>
            <h2 style={styles.title}>{editing.id ? 'Edit' : 'Create'} {labelize(section)}</h2>
            <div style={styles.form}>
              {fields.map((field) => (
                <label key={field.key} style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>{field.label}</span>
                  <Field field={field} onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))} options={options[optionResourceByField[field.key] ?? ''] ?? []} value={form[field.key]} />
                </label>
              ))}
            </div>
            <div style={styles.actions}>
              <button onClick={() => setEditing(null)} style={controlStyles.secondaryButton} type="button">Cancel</button>
              <button onClick={() => void save()} style={controlStyles.primaryButton} type="button">Save</button>
            </div>
          </div>
        </div>
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
  detail: { border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.space4 },
  drawer: { backgroundColor: 'rgba(15,23,42,.35)', inset: 0, position: 'fixed', zIndex: 20 },
  drawerPanel: { backgroundColor: colors.surface, height: '100%', marginLeft: 'auto', maxWidth: 560, overflow: 'auto', padding: spacing.space6 },
  filters: { display: 'flex', gap: spacing.space3, marginBottom: spacing.space4 },
  form: { display: 'grid', gap: spacing.space4, margin: `${spacing.space5}px 0` },
  grid: { display: 'grid', gap: spacing.space5, gridTemplateColumns: 'minmax(0, 1fr) 320px' },
  header: { alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between' },
  layout: { display: 'grid', gap: spacing.space5, gridTemplateColumns: '220px minmax(0, 1fr)' },
  linkButton: { ...controlStyles.subtleButton, marginRight: spacing.space2, padding: '4px 8px' },
  muted: { color: colors.text.muted, fontSize: font.size.small },
  nav: { border: `1px solid ${colors.border}`, borderRadius: radius.md, display: 'grid', gap: 2, padding: spacing.space3 },
  navButton: { background: 'transparent', border: 0, borderRadius: radius.sm, color: colors.text.secondary, cursor: 'pointer', padding: '9px 10px', textAlign: 'left' },
  navButtonActive: { backgroundColor: colors.surfaceElevated, color: colors.text.primary, fontWeight: font.weight.semibold },
  pre: { color: colors.text.secondary, fontSize: font.size.small, overflow: 'auto', whiteSpace: 'pre-wrap' },
  subtitle: { color: colors.text.secondary, margin: 0 },
  table: { borderCollapse: 'collapse', minWidth: 900, width: '100%' },
  tableWrap: { border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: 'auto' },
  td: { borderBottom: `1px solid ${colors.border}`, color: colors.text.secondary, fontSize: font.size.small, padding: spacing.space3 },
  th: { backgroundColor: colors.surfaceElevated, borderBottom: `1px solid ${colors.border}`, color: colors.text.muted, fontSize: font.size.small, padding: spacing.space3, textAlign: 'left' },
  title: { color: colors.text.primary, fontSize: font.size.h1, margin: 0 },
  tr: { cursor: 'pointer' },
};
