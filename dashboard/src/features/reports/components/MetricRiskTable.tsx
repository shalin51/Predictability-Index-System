import { formatReportValue, formatScore, reportStyles, TrafficBadge } from './reportFormat';

export function MetricRiskTable({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <div style={reportStyles.tableWrap}>
      <table style={reportStyles.table}>
        <thead>
          <tr>
            {['Metric', 'Run Mean', 'Target', 'Range', 'Score', 'Risk'].map((column) => <th key={column} style={reportStyles.th}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row['id'] ?? row['metricName'])}>
              <td style={reportStyles.td}>{formatReportValue(row['metricName'])}</td>
              <td style={reportStyles.td}>{formatReportValue(row['runMeanValue'])}</td>
              <td style={reportStyles.td}>{formatReportValue(row['benchmarkTargetMean'])}</td>
              <td style={reportStyles.td}>{formatReportValue(row['range'])}</td>
              <td style={reportStyles.td}>{formatScore(row['metricScore'])}</td>
              <td style={reportStyles.td}>
                <TrafficBadge value={row['trafficLight'] as string} /> {formatReportValue(row['risk'])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
