import { controlStyles } from '../../../components/ui/controls';
import { EmptyState } from '../../../components/ui/Page';
import { reportExportUrl, type DashboardRecentReport } from '../../../services/api';
import { dashboardStyles, formatDashScore, formatDashValue } from './dashboardFormat';

export function RecentReportsWidget({ onOpen, rows }: { onOpen: (id: string) => void; rows: DashboardRecentReport[] }) {
  if (rows.length === 0) return <EmptyState>No generated reports.</EmptyState>;

  return (
    <div style={dashboardStyles.tableWrap}>
      <table style={dashboardStyles.table}>
        <thead>
          <tr>
            {['Report', 'Run', 'Predictability', 'Generated At', 'Action'].map((column) => <th key={column} style={dashboardStyles.th}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.reportId}>
              <td style={dashboardStyles.td}>{row.reportName}</td>
              <td style={dashboardStyles.td}>{row.runCode}</td>
              <td style={dashboardStyles.td}>{formatDashScore(row.predictabilityIndex)}</td>
              <td style={dashboardStyles.td}>{formatDashValue(row.generatedAt)}</td>
              <td style={dashboardStyles.td}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => onOpen(row.reportId)} style={controlStyles.subtleButton} type="button">View</button>
                  <a href={reportExportUrl(row.reportId, 'pdf')} style={controlStyles.subtleButton}>PDF</a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
