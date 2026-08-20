import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import { SortButton, TablePagination, useTableState } from '../../components/ui/useTableState';
import {
  listReports,
  type GeneratedReportRecord,
} from '../../services/api';
import { formatReportValue, formatScore, reportStyles, TrafficBadge } from '../../features/reports/components/reportFormat';

export function ReportListPage({ onOpen }: { onOpen: (id: string) => void }) {
  const [records, setRecords] = useState<GeneratedReportRecord[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const table = useTableState(records, (record, key) => record[key as keyof GeneratedReportRecord], { key: 'generatedAt', direction: 'desc' });

  const load = () => {
    setLoading(true);
    setError('');
    void listReports({ search }).then(setRecords).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(load, [search]);

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
                  {[
                    ['reportName', 'Report Name'], ['runCode', 'Run Code'], ['formulation', 'Formulation'], ['bestMatch', 'Best Match'], ['predictabilityIndex', 'Predictability Index'], ['status', 'Status'], ['generatedAt', 'Generated At'],
                  ].map(([key, label]) => (
                    <th key={key} style={reportStyles.th}><SortButton column={key} onSort={table.toggleSort} sort={table.sort}>{label}</SortButton></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.pagedRecords.map((record) => (
                  <tr key={record.id}>
                    <td style={reportStyles.td}><button onClick={() => onOpen(record.id)} style={controlStyles.linkButton} type="button">{record.reportName}</button></td>
                    <td style={reportStyles.td}>{record.runCode}</td>
                    <td style={reportStyles.td}>{record.formulation}</td>
                    <td style={reportStyles.td}>{record.bestMatch ?? '-'}</td>
                    <td style={reportStyles.td}>{formatScore(record.predictabilityIndex)}</td>
                    <td style={reportStyles.td}><TrafficBadge value={record.trafficLight} /> {formatReportValue(record.status)}</td>
                    <td style={reportStyles.td}>{formatReportValue(record.generatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination currentPage={table.currentPage} onPageChange={table.setPage} pageCount={table.pageCount} />
          </div>
        )}
      </Card>
    </DashboardPage>
  );
}
