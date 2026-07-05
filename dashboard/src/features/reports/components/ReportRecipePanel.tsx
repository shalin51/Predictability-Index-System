import { formatPercent, formatReportValue, reportStyles } from './reportFormat';

export function ReportRecipePanel({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <div style={reportStyles.tableWrap}>
      <table style={reportStyles.table}>
        <thead>
          <tr>
            {['Material', 'Supplier', 'Lot', 'Percent'].map((column) => <th key={column} style={reportStyles.th}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${String(row['materialCode'] ?? row['material'])}-${String(row['lot'] ?? '')}`}>
              <td style={reportStyles.td}>{formatReportValue(row['material'])}</td>
              <td style={reportStyles.td}>{formatReportValue(row['supplier'])}</td>
              <td style={reportStyles.td}>{formatReportValue(row['lot'])}</td>
              <td style={reportStyles.td}>{formatPercent(row['percent'])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
