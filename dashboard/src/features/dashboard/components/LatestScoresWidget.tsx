import { controlStyles } from '../../../components/ui/controls';
import { EmptyState } from '../../../components/ui/Page';
import type { DashboardLatestScore } from '../../../services/api';
import { dashboardStyles, formatDashPercent, formatDashScore, TrafficBadge } from './dashboardFormat';

export function LatestScoresWidget({ onOpenReport, onOpenRun, rows }: {
  onOpenReport: (id: string) => void;
  onOpenRun: (id: string) => void;
  rows: DashboardLatestScore[];
}) {
  if (rows.length === 0) return <EmptyState>No scored runs.</EmptyState>;

  return (
    <div style={dashboardStyles.tableWrap}>
      <table style={dashboardStyles.table}>
        <thead>
          <tr>
            {['Run', 'Best Match', 'Predictability', 'X-40 Similarity', 'Lifetime Similarity', 'Status', 'Action'].map((column) => <th key={column} style={dashboardStyles.th}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.scoreReportId}>
              <td style={dashboardStyles.td}>{row.runCode}</td>
              <td style={dashboardStyles.td}>{row.bestMatch}</td>
              <td style={dashboardStyles.td}>{formatDashScore(row.predictabilityIndex)}</td>
              <td style={dashboardStyles.td}>{formatDashPercent(row.x40Similarity)}</td>
              <td style={dashboardStyles.td}>{formatDashPercent(row.lifetimeSimilarity)}</td>
              <td style={dashboardStyles.td}><TrafficBadge value={row.status} /></td>
              <td style={dashboardStyles.td}>
                <button onClick={() => row.reportId ? onOpenReport(row.reportId) : onOpenRun(row.runId)} style={controlStyles.subtleButton} type="button">
                  {row.reportId ? 'Report' : 'Run'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
