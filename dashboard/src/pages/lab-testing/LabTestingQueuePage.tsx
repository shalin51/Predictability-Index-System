import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  listLabTestingQueue,
  listLibraryOptions,
  type LabTestingQueueRecord,
  type LibraryRecord,
} from '../../services/api';
import { LabTestingQueueTable } from '../../features/lab-testing/components/LabTestingQueueTable';
import { labStyles } from '../../features/lab-testing/labTestingUi';

const defaultFilters = {
  dateProduced: '',
  machineId: '',
  missingResults: '',
  moldId: '',
  search: '',
  status: 'all',
};

export function LabTestingQueuePage({ onOpen }: { onOpen: (id: string) => void }) {
  const [records, setRecords] = useState<LabTestingQueueRecord[]>([]);
  const [machines, setMachines] = useState<LibraryRecord[]>([]);
  const [molds, setMolds] = useState<LibraryRecord[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    void listLabTestingQueue(filters).then(setRecords).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(load, [filters]);
  useEffect(() => {
    void Promise.all([listLibraryOptions('machines'), listLibraryOptions('molds')])
      .then(([machineOptions, moldOptions]) => {
        setMachines(machineOptions);
        setMolds(moldOptions);
      })
      .catch(() => undefined);
  }, []);

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={labStyles.header}>
          <div>
            <h1 style={labStyles.title}>Lab Testing</h1>
            <p style={labStyles.subtitle}>Production runs with lab testing data and progress.</p>
          </div>
        </div>
        <Divider />
        <div style={labStyles.filters}>
          <input onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search" style={{ ...controlStyles.input, ...labStyles.filterControl }} value={filters.search} />
          <select onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} style={{ ...controlStyles.input, ...labStyles.filterControl }} value={filters.status}>
            <option value="all">All Statuses</option>
            <option value="ready_for_testing">Ready</option>
            <option value="testing">Testing</option>
            <option value="completed">Completed</option>
            <option value="scored">Scored</option>
          </select>
          <input onChange={(event) => setFilters((current) => ({ ...current, dateProduced: event.target.value }))} style={{ ...controlStyles.input, ...labStyles.filterControl }} type="date" value={filters.dateProduced} />
          <select onChange={(event) => setFilters((current) => ({ ...current, machineId: event.target.value }))} style={{ ...controlStyles.input, ...labStyles.filterControl }} value={filters.machineId}>
            <option value="">Machine</option>
            {machines.map((item) => <option key={item.id} value={item.id}>{String(item['machineCode'] ?? item['label'] ?? item.id)}</option>)}
          </select>
          <select onChange={(event) => setFilters((current) => ({ ...current, moldId: event.target.value }))} style={{ ...controlStyles.input, ...labStyles.filterControl }} value={filters.moldId}>
            <option value="">Mold</option>
            {molds.map((item) => <option key={item.id} value={item.id}>{String(item['moldCode'] ?? item['label'] ?? item.id)}</option>)}
          </select>
          <select onChange={(event) => setFilters((current) => ({ ...current, missingResults: event.target.value }))} style={{ ...controlStyles.input, ...labStyles.filterControl }} value={filters.missingResults}>
            <option value="">Missing Results</option>
            <option value="true">Missing</option>
            <option value="false">Complete</option>
          </select>
        </div>
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {loading && <div style={labStyles.muted}>Loading...</div>}
        {!loading && records.length === 0 && <EmptyState>No runs ready for lab testing.</EmptyState>}
        {records.length > 0 && <LabTestingQueueTable onOpen={onOpen} records={records} />}
      </Card>
    </DashboardPage>
  );
}
