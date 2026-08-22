import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import { SortButton, TablePagination, useTableState } from '../../components/ui/useTableState';
import {
  listFormulations,
  listLibraryOptions,
  type FormulationRecord,
  type LibraryRecord,
} from '../../services/api';
import { formatValue, formulationStyles, labelize, totalTone } from './formulationUi';

export function FormulationListPage({ onCreate, onOpen }: { onCreate: () => void; onOpen: (id: string) => void }) {
  const [records, setRecords] = useState<FormulationRecord[]>([]);
  const [benchmarks, setBenchmarks] = useState<LibraryRecord[]>([]);
  const [materials, setMaterials] = useState<LibraryRecord[]>([]);
  const [filters, setFilters] = useState({ createdFrom: '', createdTo: '', materialId: '', search: '', status: 'all', targetBenchmarkId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const table = useTableState(records, (record, key) => record[key as keyof FormulationRecord], { key: 'updatedAt', direction: 'desc' });

  const load = () => {
    setLoading(true);
    setError('');
    void listFormulations(filters).then(setRecords).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(load, [filters]);
  useEffect(() => {
    void Promise.all([listLibraryOptions('benchmarks'), listLibraryOptions('materials')])
      .then(([benchmarkOptions, materialOptions]) => {
        setBenchmarks(benchmarkOptions);
        setMaterials(materialOptions);
      })
      .catch(() => undefined);
  }, []);

  const setFilter = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={formulationStyles.header}>
          <div>
            <h1 style={formulationStyles.title}>Formulations</h1>
            <p style={formulationStyles.subtitle}>Recipe versions, approval status, and component totals.</p>
          </div>
          <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
            <button onClick={onCreate} style={controlStyles.primaryButton} type="button">New Formulation</button>
          </div>
        </div>
        <Divider />
        <div style={formulationStyles.filters}>
          <input onChange={(event) => setFilter('search', event.target.value)} placeholder="Search" style={controlStyles.input} value={filters.search} />
          <select onChange={(event) => setFilter('status', event.target.value)} style={controlStyles.input} value={filters.status}>
            {['all', 'draft', 'approved', 'molded', 'testing', 'scored', 'archived'].map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
          </select>
          <select onChange={(event) => setFilter('targetBenchmarkId', event.target.value)} style={controlStyles.input} value={filters.targetBenchmarkId}>
            <option value="">Target Benchmark</option>
            {benchmarks.map((item) => <option key={item.id} value={item.id}>{String(item['label'])}</option>)}
          </select>
          <select onChange={(event) => setFilter('materialId', event.target.value)} style={controlStyles.input} value={filters.materialId}>
            <option value="">Material</option>
            {materials.map((item) => <option key={item.id} value={item.id}>{String(item['code'] ?? item['label'])}</option>)}
          </select>
          <label style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>Created from</span>
            <input onChange={(event) => setFilter('createdFrom', event.target.value)} style={controlStyles.input} type="date" value={filters.createdFrom} />
          </label>
          <label style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>Created to</span>
            <input onChange={(event) => setFilter('createdTo', event.target.value)} style={controlStyles.input} type="date" value={filters.createdTo} />
          </label>
        </div>
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {loading && <div style={formulationStyles.muted}>Loading...</div>}
        {!loading && records.length === 0 && <EmptyState>No formulations.</EmptyState>}
        {records.length > 0 && (
          <div style={formulationStyles.tableWrap}>
            <table style={formulationStyles.table}>
              <thead>
                <tr>
                  {[
                    ['formulationCode', 'Formulation Code'], ['version', 'Version'], ['status', 'Status'], ['componentsTotal', 'Components Total'], ['updatedAt', 'Last Updated'],
                  ].map(([key, label]) => (
                    <th key={key} style={formulationStyles.th}><SortButton column={key} onSort={table.toggleSort} sort={table.sort}>{label}</SortButton></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.pagedRecords.map((record) => (
                  <tr key={record.id}>
                    <td style={formulationStyles.td}><button onClick={() => onOpen(record.id)} style={controlStyles.linkButton} type="button">{record.formulationCode}</button></td>
                    <td style={formulationStyles.td}>{record.version}</td>
                    <td style={formulationStyles.td}>{labelize(record.status)}</td>
                    <td style={formulationStyles.td}><span style={{ ...formulationStyles.badge, ...totalTone(record.componentsTotal) }}>{formatValue(record.componentsTotal)}%</span></td>
                    <td style={formulationStyles.td}>{formatValue(record.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination currentPage={table.currentPage} onPageChange={table.setPage} pageCount={table.pageCount} />
          </div>
        )}
      </Card>
    </DashboardPage>
  );
}
