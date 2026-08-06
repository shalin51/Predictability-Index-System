import type { DashboardWorkflowStage } from '../../../services/api';
import { dashboardStyles } from './dashboardFormat';

export function WorkflowStatusPanel({ rows }: { rows: DashboardWorkflowStage[] }) {
  const groups = [
    { stages: ['Draft Formulation', 'Approved Formulation'], title: 'Formulations' },
    { stages: ['Production Run Created', 'Ready for Testing', 'Testing', 'Completed'], title: 'Production Runs' },
    { stages: ['Summary Generated', 'Scored', 'Report Generated'], title: 'Outputs' },
  ];

  return (
    <div className="dashboard-workflow-grid">
      {groups.map((group) => (
        <div key={group.title} style={dashboardStyles.panel}>
          <h3 style={dashboardStyles.sectionTitle}>{group.title}</h3>
          <div style={dashboardStyles.stack}>
            {group.stages.map((stage) => {
              const count = rows.find((row) => row.stage === stage)?.count ?? 0;
              return (
                <div key={stage} style={dashboardStyles.header}>
                  <span style={dashboardStyles.muted}>{stage}</span>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
