import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  archiveProductionRun,
  listApprovedFormulationOptions,
  listLibraryOptions,
  listProductionRuns,
  type LibraryRecord,
  type ProductionRunRecord,
} from '../../services/api';
import { ProductionRunFilters, type ProductionRunFiltersState } from './components/ProductionRunFilters';
import { ProductionRunTable } from './components/ProductionRunTable';
import { runStyles } from './productionRunUi';

const defaultFilters: ProductionRunFiltersState = {
  dateProduced: '',
  formulationId: '',
  machineId: '',
  moldId: '',
  search: '',
  status: 'all',
  targetBenchmarkId: '',
};

export function ProductionRunListPage({ onCreate, onOpen }: { onCreate: () => void; onOpen: (id: string) => void }) {
  const [records, setRecords] = useState<ProductionRunRecord[]>([]);
  const [benchmarks, setBenchmarks] = useState<LibraryRecord[]>([]);
  const [formulations, setFormulations] = useState<LibraryRecord[]>([]);
  const [machines, setMachines] = useState<LibraryRecord[]>([]);
  const [molds, setMolds] = useState<LibraryRecord[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    void listProductionRuns({ ...filters }).then(setRecords).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(load, [filters]);
  useEffect(() => {
    void Promise.all([
      listLibraryOptions('benchmarks'),
      listApprovedFormulationOptions(),
      listLibraryOptions('machines'),
      listLibraryOptions('molds'),
    ]).then(([benchmarkOptions, formulationOptions, machineOptions, moldOptions]) => {
      setBenchmarks(benchmarkOptions);
      setFormulations(formulationOptions);
      setMachines(machineOptions);
      setMolds(moldOptions);
    }).catch(() => undefined);
  }, []);

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={runStyles.header}>
          <div>
            <h1 style={runStyles.title}>Production Runs</h1>
            <p style={runStyles.subtitle}>Approved formulations molded into traceable batches and samples.</p>
          </div>
          <button onClick={onCreate} style={controlStyles.primaryButton} type="button">New Production Run</button>
        </div>
        <Divider />
        <ProductionRunFilters
          benchmarks={benchmarks}
          filters={filters}
          formulations={formulations}
          machines={machines}
          molds={molds}
          onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {loading && <div style={runStyles.muted}>Loading...</div>}
        {!loading && records.length === 0 && <EmptyState>No production runs.</EmptyState>}
        {records.length > 0 && (
          <ProductionRunTable
            onArchive={(id) => void archiveProductionRun(id).then(load).catch((err: Error) => setError(err.message))}
            onOpen={onOpen}
            records={records}
          />
        )}
      </Card>
    </DashboardPage>
  );
}
