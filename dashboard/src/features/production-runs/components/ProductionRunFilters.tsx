import { controlStyles } from '../../../components/ui/controls';
import type { LibraryRecord } from '../../../services/api';
import { runStyles, statusLabels } from '../productionRunUi';

export interface ProductionRunFiltersState {
  dateProduced: string;
  formulationId: string;
  machineId: string;
  moldId: string;
  search: string;
  status: string;
  targetBenchmarkId: string;
}

export function ProductionRunFilters({
  benchmarks,
  filters,
  formulations,
  machines,
  molds,
  onChange,
}: {
  benchmarks: LibraryRecord[];
  filters: ProductionRunFiltersState;
  formulations: LibraryRecord[];
  machines: LibraryRecord[];
  molds: LibraryRecord[];
  onChange: (key: keyof ProductionRunFiltersState, value: string) => void;
}) {
  return (
    <div style={runStyles.filters}>
      <input onChange={(event) => onChange('search', event.target.value)} placeholder="Search" style={controlStyles.input} value={filters.search} />
      <select onChange={(event) => onChange('status', event.target.value)} style={controlStyles.input} value={filters.status}>
        <option value="all">All Statuses</option>
        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select onChange={(event) => onChange('formulationId', event.target.value)} style={controlStyles.input} value={filters.formulationId}>
        <option value="">Formulation</option>
        {formulations.map((item) => <option key={item.id} value={item.id}>{String(item['label'])}</option>)}
      </select>
      <select onChange={(event) => onChange('machineId', event.target.value)} style={controlStyles.input} value={filters.machineId}>
        <option value="">Machine</option>
        {machines.map((item) => <option key={item.id} value={item.id}>{String(item['code'] ?? item['label'])}</option>)}
      </select>
      <select onChange={(event) => onChange('moldId', event.target.value)} style={controlStyles.input} value={filters.moldId}>
        <option value="">Mold</option>
        {molds.map((item) => <option key={item.id} value={item.id}>{String(item['code'] ?? item['label'])}</option>)}
      </select>
      <select onChange={(event) => onChange('targetBenchmarkId', event.target.value)} style={controlStyles.input} value={filters.targetBenchmarkId}>
        <option value="">Benchmark</option>
        {benchmarks.map((item) => <option key={item.id} value={item.id}>{String(item['label'])}</option>)}
      </select>
      <input onChange={(event) => onChange('dateProduced', event.target.value)} style={controlStyles.input} type="date" value={filters.dateProduced} />
    </div>
  );
}
