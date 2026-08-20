import { controlStyles } from '../../../components/ui/controls';
import { SortButton, TablePagination, useTableState } from '../../../components/ui/useTableState';
import type { LabTestingQueueRecord } from '../../../services/api';
import { LabTestingProgressBar } from './LabTestingProgressBar';
import { labStyles } from '../labTestingUi';

export function LabTestingQueueTable({ onOpen, records }: { onOpen: (id: string) => void; records: LabTestingQueueRecord[] }) {
  const table = useTableState(records, (record, key) => record[key as keyof LabTestingQueueRecord], { key: 'dateProduced', direction: 'desc' });
  return (
    <div style={labStyles.tableWrap}>
      <table style={labStyles.table}>
        <thead>
          <tr>
            {[
              ['runCode', 'Run Code'], ['formulation', 'Formulation'], ['targetBenchmark', 'Target Benchmark'], ['status', 'Status'], ['completedResults', 'Completed Results'], ['missingRequiredMetrics', 'Missing Required Metrics'],
            ].map(([key, label]) => (
              <th key={key} style={labStyles.th}><SortButton column={key} onSort={table.toggleSort} sort={table.sort}>{label}</SortButton></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.pagedRecords.map((record) => (
            <tr key={record.id}>
              <td style={labStyles.td}><button onClick={() => onOpen(record.id)} style={controlStyles.linkButton} type="button">{record.runCode}</button></td>
              <td style={labStyles.td}>{record.formulation}</td>
              <td style={labStyles.td}>{record.targetBenchmark ?? '-'}</td>
              <td style={labStyles.td}>{record.status === 'ready_for_testing' ? 'Ready for Testing' : 'Testing'}</td>
              <td style={labStyles.td}><LabTestingProgressBar completed={record.completedResults} total={record.requiredResultCount} /></td>
              <td style={labStyles.td}>{record.missingRequiredMetrics}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TablePagination currentPage={table.currentPage} onPageChange={table.setPage} pageCount={table.pageCount} />
    </div>
  );
}
