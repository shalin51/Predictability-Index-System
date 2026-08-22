import { controlStyles } from '../../../components/ui/controls';
import { DateRangePicker } from '../../../components/ui/DateRangePicker';
import type { LibraryRecord } from '../../../services/api';
import { runStyles, statusLabels } from '../productionRunUi';

export interface ProductionRunFiltersState {
  dateProducedFrom: string;
  dateProducedTo: string;
  formulationId: string;
  machineId: string;
  search: string;
  status: string;
}

export function ProductionRunFilters({
  filters,
  formulations,
  machines,
  onChange,
}: {
  filters: ProductionRunFiltersState;
  formulations: LibraryRecord[];
  machines: LibraryRecord[];
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
      <DateRangePicker
        label="Date produced"
        onChange={({ from, to }) => {
          onChange('dateProducedFrom', from);
          onChange('dateProducedTo', to);
        }}
        value={{ from: filters.dateProducedFrom, to: filters.dateProducedTo }}
      />
    </div>
  );
}
