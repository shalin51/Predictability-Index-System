import type { DashboardSummary } from '../../../services/api';
import { dashboardStyles } from './dashboardFormat';

interface AttentionItem {
  count: number;
  href: string;
  label: string;
}

export function NeedsAttentionPanel({ riskAlertCount, summary }: { riskAlertCount: number; summary: DashboardSummary }) {
  const items: AttentionItem[] = [
    { count: riskAlertCount, href: '/production-runs', label: 'Metric risks require review' },
    { count: summary.runsReadyForTesting, href: '/lab-testing', label: 'Runs are ready for lab testing' },
    { count: summary.runsAwaitingSummary, href: '/production-runs', label: 'Runs need metric summaries' },
    { count: summary.runsAwaitingScoring, href: '/production-runs', label: 'Runs are ready for scoring' },
  ].filter((item) => item.count > 0);

  return (
    <div style={dashboardStyles.panel}>
      {items.length === 0 ? (
        <span style={dashboardStyles.muted}>No current workflow blockers.</span>
      ) : (
        <div style={dashboardStyles.stack}>
          {items.map((item) => (
            <a className="dashboard-attention-row" href={item.href} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
