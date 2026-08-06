import type { DashboardBenchmarkOverview } from '../../../services/api';
import { getChartFillColor } from '../../../theme/semantic';
import { dashboardStyles, formatDashValue } from './dashboardFormat';

export function BenchmarkOverviewWidget({ overview }: { overview: DashboardBenchmarkOverview }) {
  if (overview.bestMatchCounts.length === 0) return null;
  const maxCount = Math.max(...overview.bestMatchCounts.map((row) => Number(row['count'] ?? 0)), 1);

  return (
    <div style={dashboardStyles.panel}>
      <div style={dashboardStyles.stack}>
        {overview.bestMatchCounts.map((row) => (
          <Bar key={String(row['benchmarkCode'])} label={formatDashValue(row['benchmarkName'])} max={maxCount} value={Number(row['count'] ?? 0)} />
        ))}
      </div>
    </div>
  );
}

function Bar({ label, max, value }: { label: string; max: number; value: number }) {
  const width = Math.max(4, (value / max) * 100);
  return (
    <div style={dashboardStyles.stack}>
      <div style={dashboardStyles.header}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div style={dashboardStyles.barTrack}>
        <div style={{ backgroundColor: getChartFillColor('brand'), height: '100%', width: `${width}%` }} />
      </div>
    </div>
  );
}
