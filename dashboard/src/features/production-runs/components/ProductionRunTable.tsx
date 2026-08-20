import { controlStyles } from '../../../components/ui/controls';
import { SortButton, TablePagination, useTableState } from '../../../components/ui/useTableState';
import type { ProductionRunRecord } from '../../../services/api';
import { formatValue, runStyles } from '../productionRunUi';
import { ProductionRunStatusBadge } from './ProductionRunStatusBadge';

export function ProductionRunTable({
  onOpen,
  records,
}: {
  onOpen: (id: string) => void;
  records: ProductionRunRecord[];
}) {
  const table = useTableState(records, (record, key) => record[key as keyof ProductionRunRecord], { key: 'dateProduced', direction: 'desc' });
  return (
    <div style={runStyles.tableWrap}>
      <table style={runStyles.table}>
        <thead>
          <tr>
            {[
              ['runCode', 'Run Code'], ['formulation', 'Formulation'], ['dateProduced', 'Date Produced'], ['status', 'Status'],
            ].map(([key, label]) => (
              <th key={key} style={runStyles.th}><SortButton column={key} onSort={table.toggleSort} sort={table.sort}>{label}</SortButton></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.pagedRecords.map((record) => (
            <tr key={record.id}>
              <td style={runStyles.td}><button onClick={() => onOpen(record.id)} style={controlStyles.linkButton} type="button">{record.runCode}</button></td>
              <td style={runStyles.td}>{record.formulation}</td>
              <td style={runStyles.td}>{formatValue(record.dateProduced)}</td>
              <td style={runStyles.td}><ProductionRunStatusBadge status={record.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <TablePagination currentPage={table.currentPage} onPageChange={table.setPage} pageCount={table.pageCount} />
    </div>
  );
}
