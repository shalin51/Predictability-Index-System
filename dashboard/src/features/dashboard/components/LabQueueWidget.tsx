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
            {['Run Code', 'Formulation', 'Result Progress', 'Missing Metrics', 'Status', 'Action'].map((column) => <th key={column} style={dashboardStyles.th}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={dashboardStyles.td}>{row.runCode}</td>
              <td style={dashboardStyles.td}>{row.formulation}</td>
              <td style={dashboardStyles.td}><ResultProgress completed={row.completedResults} required={row.requiredResultCount} /></td>
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

function ResultProgress({ completed, required }: { completed: number; required: number }) {
  const percent = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
  return (
    <div aria-label={`${completed} of ${required} required results complete`} style={{ display: 'grid', gap: 6, minWidth: 130 }}>
      <span>{completed} / {required} ({percent}%)</span>
      <div style={dashboardStyles.barTrack}>
        <div className="dashboard-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
