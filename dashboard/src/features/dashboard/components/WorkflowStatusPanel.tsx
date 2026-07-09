import { getChartFillColor } from '../../../theme/semantic';
import type { DashboardWorkflowStage } from '../../../services/api';
import { dashboardStyles } from './dashboardFormat';

export function WorkflowStatusPanel({ rows }: { rows: DashboardWorkflowStage[] }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <div style={dashboardStyles.stack}>
      {rows.map((row) => (
        <div key={row.stage} style={dashboardStyles.panel}>
          <div style={dashboardStyles.header}>
            <strong>{row.stage}</strong>
            <span style={dashboardStyles.muted}>{row.count}</span>
          </div>
          <div style={dashboardStyles.barTrack}>
            <div style={{ backgroundColor: getChartFillColor('brand'), height: '100%', width: `${(row.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
