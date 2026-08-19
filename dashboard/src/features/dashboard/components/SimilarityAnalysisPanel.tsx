import type { ReactNode } from 'react';
import type { DashboardSimilarityAnalysis } from '../../../services/api';
import { dashboardStyles, formatDashValue } from './dashboardFormat';

export function SimilarityAnalysisPanel({ analysis }: { analysis: DashboardSimilarityAnalysis | null }) {
  if (!analysis) return null;

  return (
    <div style={dashboardStyles.stack}>
      <div style={dashboardStyles.header}>
        <div>
          <h2 style={dashboardStyles.sectionTitle}>{analysis.analysisName}</h2>
          <p style={dashboardStyles.subtitle}>Target: {analysis.targetName} · {analysis.candidateCount} candidates</p>
        </div>
      </div>
      <div className="dashboard-two-column-grid">
        <AnalysisTable title="Ranked candidates" columns={['Rank', 'Candidate', 'Deviation']}>
          {analysis.candidates.map((candidate) => (
            <tr key={candidate.candidateName}>
              <td style={dashboardStyles.td}>{formatDashValue(candidate.rank)}</td>
              <td style={dashboardStyles.td}>{candidate.candidateName}{candidate.confidenceNote && <small style={{ display: 'block' }}>{candidate.confidenceNote}</small>}</td>
              <td style={dashboardStyles.td}>{candidate.weightedDeviationPercent.toFixed(2)}%</td>
            </tr>
          ))}
        </AnalysisTable>
        <AnalysisTable title="Top candidate metric comparison" columns={['Metric', 'Target', 'Candidate', 'Deviation', 'Weight', 'Contribution']}>
          {analysis.metrics.map((metric) => (
            <tr key={metric.metricName}>
              <td style={dashboardStyles.td}>{metric.metricName}</td>
              <td style={dashboardStyles.td}>{formatDashValue(metric.targetMean)}</td>
              <td style={dashboardStyles.td}>{formatDashValue(metric.candidateMean)}</td>
              <td style={dashboardStyles.td}>{metric.signedDeviationPercent.toFixed(2)}%</td>
              <td style={dashboardStyles.td}>{(metric.weight * 100).toFixed(0)}%</td>
              <td style={dashboardStyles.td}>{metric.weightedDeviationPoints.toFixed(2)}</td>
            </tr>
          ))}
        </AnalysisTable>
      </div>
    </div>
  );
}

function AnalysisTable({ children, columns, title }: { children: ReactNode; columns: string[]; title: string }) {
  return (
    <section style={dashboardStyles.stack}>
      <h3 style={dashboardStyles.sectionTitle}>{title}</h3>
      <div style={dashboardStyles.tableWrap}>
        <table style={dashboardStyles.table}>
          <thead><tr>{columns.map((column) => <th key={column} style={dashboardStyles.th}>{column}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </section>
  );
}
