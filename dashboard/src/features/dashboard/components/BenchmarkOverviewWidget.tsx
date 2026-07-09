import { EmptyState } from '../../../components/ui/Page';
import type { DashboardBenchmarkOverview } from '../../../services/api';
import { getChartFillColor } from '../../../theme/semantic';
import { dashboardStyles, formatDashPercent, formatDashScore, formatDashValue, TrafficBadge, trafficColor } from './dashboardFormat';

export function BenchmarkOverviewWidget({ overview }: { overview: DashboardBenchmarkOverview }) {
  const hasData = overview.trafficCounts.length > 0 || overview.bestMatchCounts.length > 0 || overview.topCandidates.length > 0;
  if (!hasData) return <EmptyState>No benchmark overview data.</EmptyState>;

  return (
    <div style={dashboardStyles.gridTwo}>
      <div style={dashboardStyles.panel}>
        <h3 style={dashboardStyles.sectionTitle}>Traffic Light Counts</h3>
        <div style={dashboardStyles.stack}>
          {overview.trafficCounts.map((row) => (
            <Bar key={String(row['status'])} label={formatDashValue(row['status'])} tone={String(row['status'])} value={Number(row['count'] ?? 0)} />
          ))}
        </div>
      </div>
      <div style={dashboardStyles.panel}>
        <h3 style={dashboardStyles.sectionTitle}>Best Match Counts</h3>
        <div style={dashboardStyles.stack}>
          {overview.bestMatchCounts.map((row) => (
            <Bar key={String(row['benchmarkCode'])} label={formatDashValue(row['benchmarkName'])} value={Number(row['count'] ?? 0)} />
          ))}
        </div>
      </div>
      <div style={dashboardStyles.panel}>
        <h3 style={dashboardStyles.sectionTitle}>Latest Similarity</h3>
        <div style={dashboardStyles.stack}>
          {overview.latestSimilarity.slice(0, 6).map((row, index) => (
            <div key={`${String(row['runId'])}-${String(row['benchmarkCode'])}-${index}`} style={dashboardStyles.header}>
              <span>{formatDashValue(row['runCode'])} | {formatDashValue(row['benchmarkName'])}</span>
              <strong>{formatDashPercent(row['similarityScore'])}</strong>
            </div>
          ))}
        </div>
      </div>
      <div style={dashboardStyles.panel}>
        <h3 style={dashboardStyles.sectionTitle}>Best Candidates</h3>
        <div style={dashboardStyles.stack}>
          {overview.topCandidates.map((row) => (
            <div key={String(row['runId'])} style={dashboardStyles.header}>
              <span>{formatDashValue(row['runCode'])} | {formatDashValue(row['bestMatch'])}</span>
              <span><TrafficBadge value={row['status'] as string} /> {formatDashScore(row['predictabilityIndex'])}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, tone, value }: { label: string; tone?: string; value: number }) {
  const width = Math.max(8, Math.min(100, value * 12));
  return (
    <div style={dashboardStyles.stack}>
      <div style={dashboardStyles.header}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div style={dashboardStyles.barTrack}>
        <div style={{ backgroundColor: tone ? trafficColor(tone) : getChartFillColor('brand'), height: '100%', width: `${width}%` }} />
      </div>
    </div>
  );
}
