import { Button } from '../../../components/ui/Button';
import { dashboardStyles } from './dashboardFormat';

export function DashboardEmptyState() {
  return (
    <div className="dashboard-empty-state">
      <div style={dashboardStyles.stack}>
        <h2 style={dashboardStyles.sectionTitle}>No operational data yet</h2>
        <p style={dashboardStyles.subtitle}>Start with controlled material data, then create and approve a formulation.</p>
      </div>
      <div className="dashboard-empty-actions">
        <Button as="a" href="/materials" variant="secondary">Review materials</Button>
        <Button as="a" href="/formulations/new">Create formulation</Button>
      </div>
    </div>
  );
}
