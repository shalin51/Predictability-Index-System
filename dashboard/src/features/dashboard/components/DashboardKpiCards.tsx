import type { DashboardSummary } from '../../../services/api';
import { dashboardStyles } from './dashboardFormat';

const actionCards: Array<{ href: string; key: keyof DashboardSummary; label: string }> = [
  { href: '/lab-testing', key: 'runsReadyForTesting', label: 'Ready for Testing' },
  { href: '/production-runs', key: 'runsAwaitingSummary', label: 'Awaiting Summary' },
  { href: '/production-runs', key: 'runsAwaitingScoring', label: 'Awaiting Scoring' },
];

export function DashboardKpiCards({ riskAlertCount, summary }: { riskAlertCount: number; summary: DashboardSummary }) {
  return (
    <div style={dashboardStyles.stack}>
      <div className="dashboard-summary-grid">
        {actionCards.map((card) => (
          <a className="dashboard-kpi-card" href={card.href} key={card.key}>
            <span style={dashboardStyles.muted}>{card.label}</span>
            <strong style={dashboardStyles.kpiValue}>{summary[card.key]}</strong>
            <span style={dashboardStyles.actionLink}>Open queue</span>
          </a>
        ))}
        <a className="dashboard-kpi-card" href="/production-runs">
          <span style={dashboardStyles.muted}>Risk Alerts</span>
          <strong style={dashboardStyles.kpiValue}>{riskAlertCount}</strong>
          <span style={dashboardStyles.actionLink}>Review scores</span>
        </a>
      </div>
      <div className="dashboard-secondary-metrics">
        <a className="dashboard-secondary-metric" href="/formulations">
          <span style={dashboardStyles.muted}>Active Formulations</span>
          <strong>{summary.activeFormulations}</strong>
        </a>
        <a className="dashboard-secondary-metric" href="/production-runs">
          <span style={dashboardStyles.muted}>Scored Runs</span>
          <strong>{summary.scoredRuns}</strong>
        </a>
        <a className="dashboard-secondary-metric" href="/production-runs">
          <span style={dashboardStyles.muted}>Candidate Health</span>
          <span><strong>{summary.greenCandidates}</strong> green · <strong>{summary.yellowCandidates}</strong> yellow · <strong>{summary.redCandidates}</strong> red</span>
        </a>
      </div>
    </div>
  );
}
