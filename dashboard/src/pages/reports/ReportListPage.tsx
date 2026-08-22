import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import { SortButton, TablePagination, useTableState } from '../../components/ui/useTableState';
import {
  listReports,
  downloadDatabaseWorkbook,
  type GeneratedReportRecord,
} from '../../services/api';
import { formatReportValue, formatScore, reportStyles, TrafficBadge } from '../../features/reports/components/reportFormat';

export function ReportListPage({ onOpen, onOpenProductionRuns }: { onOpen: (id: string) => void; onOpenProductionRuns: () => void }) {
  const [records, setRecords] = useState<GeneratedReportRecord[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const table = useTableState(records, (record, key) => record[key as keyof GeneratedReportRecord], { key: 'generatedAt', direction: 'desc' });

  const load = () => {
    setLoading(true);
    setError('');
    void listReports({ search }).then(setRecords).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(load, [search]);

  const exportDatabase = async (category: string) => {
    setExporting(true);
    setError('');
    try { await downloadDatabaseWorkbook(category); }
    catch (err) { setError(err instanceof Error ? err.message : 'Database export failed'); }
    finally { setExporting(false); }
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
        <DatabaseDownloads disabled={exporting} exporting={exporting} onDownload={exportDatabase} />
        <Divider />
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reports"
          style={{ ...controlStyles.input, maxWidth: 360 }}
          value={search}
        />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {loading && <div style={reportStyles.muted}>Loading...</div>}
        {!loading && records.length === 0 && (
          <div style={reportStyles.stack}>
            <EmptyState>No generated reports.</EmptyState>
            <button onClick={onOpenProductionRuns} style={controlStyles.primaryButton} type="button">Open Production Runs</button>
          </div>
        )}
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

const databaseDownloads = [
  { title: 'Download Materials Database', items: [['Material Properties', 'material-properties'], ['Material Suppliers', 'material-suppliers'], ['Material Details', 'material-details'], ['Material Name & All Properties', 'materials-with-properties']] },
  { title: 'Download Machine Database', items: [['Machine Specifications', 'machine-specifications'], ['Mold Template', 'mold-template'], ['Machine Template', 'machine-template'], ['Machines', 'machines']] },
  { title: 'Download Formulation Database', items: [['Formulation Details', 'formulation-details'], ['Formulation Materials', 'formulation-materials'], ['Formulation Benchmarks', 'formulation-benchmarks'], ['Formulation Template', 'formulation-templates']] },
  { title: 'Download Product Run Database', items: [['Product Run Details', 'product-run-details'], ['Process Values', 'product-run-process-values'], ['Material Lots', 'product-run-material-lots'], ['Run Notes', 'product-run-notes']] },
  { title: 'Download Testing Database', items: [['Testing Specifications', 'testing-specifications'], ['Test Methods', 'testing-methods'], ['Test Conditions', 'testing-conditions'], ['Testing Results', 'testing-results']] },
] as const;

function DatabaseDownloads({ disabled, exporting, onDownload }: { disabled: boolean; exporting: boolean; onDownload: (category: string) => Promise<void> }) {
  return (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', margin: '16px 0' }}>
      {databaseDownloads.map((group) => (
        <div key={group.title} style={{ border: '1px solid #d8dee9', borderRadius: 8, padding: 14 }}>
          <strong>{group.title}</strong>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {group.items.map(([label, category]) => (
              <button disabled={disabled} key={category} onClick={() => void onDownload(category)} style={controlStyles.secondaryButton} type="button">
                {exporting ? 'Exporting...' : label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
