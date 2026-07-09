import { controlStyles } from '../../../components/ui/controls';
import { EmptyState } from '../../../components/ui/Page';
import type { DashboardRiskAlert } from '../../../services/api';
import { dashboardStyles, formatDashValue, TrafficBadge } from './dashboardFormat';

export function RiskAlertsWidget({ onOpenRun, rows }: { onOpenRun: (id: string) => void; rows: DashboardRiskAlert[] }) {
  if (rows.length === 0) return <EmptyState>No high-risk metric alerts.</EmptyState>;

  return (
    <div style={dashboardStyles.tableWrap}>
      <table style={dashboardStyles.table}>
        <thead>
          <tr>
            {['Risk', 'Run', 'Metric', 'Severity', 'Action'].map((column) => <th key={column} style={dashboardStyles.th}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.scoreReportId}-${row.metricName}`}>
              <td style={dashboardStyles.td}>{row.risk}</td>
              <td style={dashboardStyles.td}>{row.runCode}</td>
              <td style={dashboardStyles.td}>{row.metricName}</td>
              <td style={dashboardStyles.td}><TrafficBadge value={row.trafficLight} /> {formatDashValue(row.severity)}</td>
              <td style={dashboardStyles.td}><button onClick={() => onOpenRun(row.runId)} style={controlStyles.subtleButton} type="button">View Score</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
