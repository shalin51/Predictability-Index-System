import { formatPercent, formatScore, reportStyles, TrafficBadge } from './reportFormat';

export function BenchmarkComparisonTable({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <div style={reportStyles.tableWrap}>
      <table style={reportStyles.table}>
        <thead>
          <tr>
            {['Benchmark', 'Similarity', 'Predictability', 'Readiness', 'Status'].map((column) => <th key={column} style={reportStyles.th}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row['benchmarkCode'] ?? row['benchmarkName'])}>
              <td style={reportStyles.td}>{String(row['benchmarkName'] ?? '-')}</td>
              <td style={reportStyles.td}>{formatPercent(row['similarityScore'])}</td>
              <td style={reportStyles.td}>{formatScore(row['predictabilityIndex'])}</td>
              <td style={reportStyles.td}>{formatPercent(row['productionReadinessScore'])}</td>
              <td style={reportStyles.td}><TrafficBadge value={row['status'] as string} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
