import { controlStyles } from '../../../components/ui/controls';
import { EmptyState } from '../../../components/ui/Page';
import type { DashboardLabQueueItem } from '../../../services/api';
import { dashboardStyles, formatDashValue } from './dashboardFormat';

export function LabQueueWidget({ onOpen, rows }: { onOpen: (id: string) => void; rows: DashboardLabQueueItem[] }) {
  if (rows.length === 0) return <EmptyState>No ready or active lab testing runs.</EmptyState>;

  return (
    <div style={dashboardStyles.tableWrap}>
      <table style={dashboardStyles.table}>
        <thead>
          <tr>
            {['Run Code', 'Formulation', 'Samples', 'Missing Metrics', 'Status', 'Action'].map((column) => <th key={column} style={dashboardStyles.th}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={dashboardStyles.td}>{row.runCode}</td>
              <td style={dashboardStyles.td}>{row.formulation}</td>
              <td style={dashboardStyles.td}>{row.sampleCount}</td>
              <td style={dashboardStyles.td}>{row.missingRequiredMetrics}</td>
              <td style={dashboardStyles.td}>{formatDashValue(row.status)}</td>
              <td style={dashboardStyles.td}><button onClick={() => onOpen(row.id)} style={controlStyles.subtleButton} type="button">Open</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
