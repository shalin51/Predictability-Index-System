import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardSubtitle, CardTitle, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../components/ui/DataTable';
import { SortButton, TablePagination, useTableState } from '../../components/ui/useTableState';
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
import { coerceLibraryPayload, LibraryRecordForm, libraryOptionResources } from './LibraryRecordForm';
import { labelize, LibrarySectionNav } from './LibrarySectionNav';
import { DataTransferActions } from '../../components/data-transfer/DataTransferActions';

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
  benchmarks: ['benchmarkName', 'profileVersion', 'ballBrand', 'ballModel', 'status'],
  machines: ['machineName', 'manufacturer', 'machineType', 'modelNumber', 'location', 'status'],
  'machine-parameters': ['displayName', 'sectionKey', 'positionLabel', 'minimumValue', 'maximumValue', 'unit', 'status'],
  materials: ['materialName', 'materialCode', 'productGrade', 'chemistry', 'roleInBlend', 'sourceRevisionDate', 'status'],
  'material-properties': ['propertyName', 'productGrade', 'propertyId', 'valueNumeric', 'valueText', 'qualifier', 'unit', 'testMethod', 'testCondition'],
  'material-suppliers': ['supplierName', 'supplierRole', 'contactName', 'contactEmail', 'contactPhone', 'status'],
  metrics: ['displayName', 'metricKey', 'category', 'defaultUnit', 'dataType', 'benchmarkComparable', 'requiredForScoring', 'status'],
  molds: ['moldName', 'moldType', 'manufacturer', 'cavityCount', 'zoneCount', 'status'],
  'mold-zones': ['zoneNumber', 'zoneName', 'zoneType', 'minimumTemperature', 'maximumTemperature', 'temperatureUnit', 'status'],
  'scoring-rules': ['metricKey', 'comparisonMode', 'targetMean', 'minAcceptable', 'maxAcceptable', 'targetStdDev', 'weight', 'criticality'],
  suppliers: ['supplierName', 'supplierType', 'contactName', 'contactEmail', 'contactPhone', 'status'],
  'test-conditions': ['conditionCode', 'conditionName', 'description', 'status'],
  'test-methods': ['methodName', 'methodCode', 'metricKey', 'status'],
  'process-setups': ['machine', 'mold', 'formulation', 'revisionNo', 'status', 'approvedBy', 'approvedAt', 'parameterCount'],
};

export function LibraryPage({
  activeSection,
  onSectionChange,
  onImport,
  onOpenRecord,
  sectionOptions,
  standalone = false,
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onImport?: () => void;
  onOpenRecord: (id: string) => void;
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
  const visibleColumns = columns[section] ?? [];
  const table = useTableState(records, (record, key) => record[key], { key: visibleColumns.find((column) => /date|at$/i.test(column)) ?? visibleColumns[0] ?? 'id', direction: visibleColumns.some((column) => /date|at$/i.test(column)) ? 'desc' : 'asc' });

  useEffect(() => {
    setStatus(section === 'benchmarks' ? 'all' : 'active');
  }, [section]);

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
    void Promise.all(libraryOptionResources.map((resource) =>
      listLibraryOptions(resource).then((items) => [resource, items] as const)
    )).then((entries) => setOptions(Object.fromEntries(entries))).catch(() => undefined);
  }, []);

  const startEdit = (record?: LibraryRecord) => {
    setEditing(record ?? { id: '' });
    setForm(record ?? Object.fromEntries(fields.map((field) => [field.key, field.type === 'boolean' ? false : field.key === 'status' ? 'active' : ''])));
  };

  const save = async () => {
    try {
      const payload = coerceLibraryPayload(fields, form);
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
        <LibrarySectionNav activeSection={section} onSectionChange={onSectionChange} sections={visibleSections} />
        <Card style={styles.card}>
          <CardHeader>
            <div>
              <CardTitle>{labelize(section)}</CardTitle>
              <CardSubtitle>{standalone ? `Manage ${labelize(section).toLowerCase()} master data used by formulations and production.` : 'Controlled reference records for dropdowns, benchmarks, and scoring.'}</CardSubtitle>
            </div>
            <div style={styles.headerActions}>
              {section !== 'process-setups' && <DataTransferActions onImported={load} resource={section} />}
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
              {section === 'materials' && onImport && <Button onClick={onImport} type="button" variant="subtle">Advanced Catalog Import</Button>}
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
                    {visibleColumns.map((column) => <DataTableHead key={column}><SortButton column={column} onSort={table.toggleSort} sort={table.sort}>{labelize(column)}</SortButton></DataTableHead>)}
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {table.pagedRecords.map((record) => {
                    const isSelected = selected?.id === record.id;
                    return (
                      <DataTableRow key={record.id} onClick={() => setSelected(record)} selected={isSelected}>
                        {visibleColumns.map((column) => (
                          <DataTableCell key={column}>
                            {column === visibleColumns[0] ? <button onClick={(event) => { event.stopPropagation(); onOpenRecord(record.id); }} style={controlStyles.linkButton} type="button">{formatValue(record[column])}</button> : formatValue(record[column])}
                          </DataTableCell>
                        ))}
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              </DataTable>
              <TablePagination currentPage={table.currentPage} onPageChange={table.setPage} pageCount={table.pageCount} />
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
              <LibraryRecordForm fields={fields} form={form} onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))} options={options} />
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

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && value.includes('T')) return value.slice(0, 10);
  return String(value);
}

const styles: Record<string, CSSProperties> = {
  actions: { display: 'flex', gap: spacing.space3, justifyContent: 'flex-end' },
  card: { flex: '1 1 auto', minHeight: 0, overflow: 'hidden' },
  filters: { display: 'flex', gap: spacing.space3, marginBottom: spacing.space4 },
  form: { display: 'grid', gap: spacing.space4, margin: `${spacing.space5}px 0` },
  headerActions: { display: 'flex', gap: spacing.space3 },
  layout: { display: 'flex', flexDirection: 'column', gap: spacing.space5, height: '100%', minHeight: 0, overflow: 'hidden' },
  layoutStandalone: {},
  muted: { color: colors.text.muted, fontSize: font.size.small },
  tableWrap: { border: `1px solid ${colors.border}`, borderRadius: radius.md, minHeight: 0, overflow: 'auto' },
};
