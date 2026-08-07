import type { DashboardWorkflowStage } from '../../../services/api';
import { dashboardStyles } from './dashboardFormat';

export function WorkflowStatusPanel({ rows }: { rows: DashboardWorkflowStage[] }) {
  const orderedRows = [...rows].sort((left, right) => left.sortOrder - right.sortOrder);
  const groups = [
    { rows: orderedRows.filter((row) => row.sortOrder <= 2), title: 'Formulations' },
    { rows: orderedRows.filter((row) => row.sortOrder > 2 && row.sortOrder <= 6), title: 'Production Runs' },
    { rows: orderedRows.filter((row) => row.sortOrder > 6), title: 'Outputs' },
  ];

  return (
    <div className="dashboard-workflow-grid">
      {groups.map((group) => (
        <div key={group.title} style={dashboardStyles.panel}>
          <h3 style={dashboardStyles.sectionTitle}>{group.title}</h3>
          <div style={dashboardStyles.stack}>
            {group.rows.map((row) => (
              <div key={row.stage} style={dashboardStyles.header}>
                <span style={dashboardStyles.muted}>{row.stage}</span>
                <strong>{row.count}</strong>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
