import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  listReports,
  regenerateRunReport,
  reportExportUrl,
  type GeneratedReportRecord,
} from '../../services/api';
import { formatReportValue, formatScore, reportStyles, TrafficBadge } from '../../features/reports/components/reportFormat';

export function ReportListPage({ onOpen }: { onOpen: (id: string) => void }) {
  const [records, setRecords] = useState<GeneratedReportRecord[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    void listReports({ search }).then(setRecords).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(load, [search]);

  const regenerate = async (runId: string) => {
    try {
      const report = await regenerateRunReport(runId);
      onOpen(report.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regenerate failed');
    }
  };

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={reportStyles.header}>
          <div>
            <h1 style={reportStyles.title}>Reports</h1>
            <p style={reportStyles.subtitle}>Generated score reports and exports.</p>
          </div>
        </div>
        <Divider />
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reports"
          style={{ ...controlStyles.input, maxWidth: 360 }}
          value={search}
        />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {loading && <div style={reportStyles.muted}>Loading...</div>}
        {!loading && records.length === 0 && <EmptyState>No generated reports.</EmptyState>}
        {records.length > 0 && (
          <div style={reportStyles.tableWrap}>
            <table style={reportStyles.table}>
              <thead>
                <tr>
                  {['Report Name', 'Run Code', 'Formulation', 'Best Match', 'Predictability Index', 'Status', 'Generated At', 'Actions'].map((column) => (
                    <th key={column} style={reportStyles.th}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td style={reportStyles.td}>{record.reportName}</td>
                    <td style={reportStyles.td}>{record.runCode}</td>
                    <td style={reportStyles.td}>{record.formulation}</td>
                    <td style={reportStyles.td}>{record.bestMatch ?? '-'}</td>
                    <td style={reportStyles.td}>{formatScore(record.predictabilityIndex)}</td>
                    <td style={reportStyles.td}><TrafficBadge value={record.trafficLight} /> {formatReportValue(record.status)}</td>
                    <td style={reportStyles.td}>{formatReportValue(record.generatedAt)}</td>
                    <td style={reportStyles.td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button onClick={() => onOpen(record.id)} style={controlStyles.subtleButton} type="button">View</button>
                        <a href={reportExportUrl(record.id, 'pdf')} style={controlStyles.subtleButton}>PDF</a>
                        <a href={reportExportUrl(record.id, 'csv')} style={controlStyles.subtleButton}>CSV</a>
                        <button onClick={() => void regenerate(record.productionRunId)} style={controlStyles.subtleButton} type="button">Regenerate</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardPage>
  );
}
