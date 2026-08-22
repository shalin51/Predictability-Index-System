import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
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
  dateProducedFrom: '',
  dateProducedTo: '',
  formulationId: '',
  machineId: '',
  search: '',
  status: 'all',
};

export function ProductionRunListPage({ onCreate, onImport, onOpen }: { onCreate: () => void; onImport?: () => void; onOpen: (id: string) => void }) {
  const [records, setRecords] = useState<ProductionRunRecord[]>([]);
  const [formulations, setFormulations] = useState<LibraryRecord[]>([]);
  const [machines, setMachines] = useState<LibraryRecord[]>([]);
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
      listApprovedFormulationOptions(),
      listLibraryOptions('machines'),
    ]).then(([formulationOptions, machineOptions]) => {
      setFormulations(formulationOptions);
      setMachines(machineOptions);
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
          <div style={runStyles.actions}>
            {onImport && <button onClick={onImport} style={controlStyles.secondaryButton} type="button">Import Setup Sheet</button>}
            <button onClick={onCreate} style={controlStyles.primaryButton} type="button">New Production Run</button>
          </div>
        </div>
        <Divider />
        <ProductionRunFilters
          filters={filters}
          formulations={formulations}
          machines={machines}
          onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {loading && <div style={runStyles.muted}>Loading...</div>}
        {!loading && records.length === 0 && <EmptyState>No production runs.</EmptyState>}
        {records.length > 0 && (
          <ProductionRunTable
            onOpen={onOpen}
            records={records}
          />
        )}
      </Card>
    </DashboardPage>
  );
}
