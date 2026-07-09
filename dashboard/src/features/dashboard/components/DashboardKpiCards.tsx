import type { DashboardSummary } from '../../../services/api';
import { dashboardStyles } from './dashboardFormat';

const cards: Array<{ key: keyof DashboardSummary; label: string }> = [
  { key: 'activeFormulations', label: 'Active Formulations' },
  { key: 'runsReadyForTesting', label: 'Runs Ready for Testing' },
  { key: 'runsAwaitingSummary', label: 'Runs Awaiting Summary' },
  { key: 'runsAwaitingScoring', label: 'Runs Awaiting Scoring' },
  { key: 'scoredRuns', label: 'Scored Runs' },
  { key: 'greenCandidates', label: 'Green Candidates' },
  { key: 'yellowCandidates', label: 'Yellow Candidates' },
  { key: 'redCandidates', label: 'Red Candidates' },
];

export function DashboardKpiCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div style={dashboardStyles.cardGrid}>
      {cards.map((card) => (
        <div key={card.key} style={dashboardStyles.panel}>
          <div style={dashboardStyles.muted}>{card.label}</div>
          <strong>{summary[card.key]}</strong>
        </div>
      ))}
    </div>
  );
}
