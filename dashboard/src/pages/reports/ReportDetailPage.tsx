import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import { BenchmarkComparisonTable } from '../../features/reports/components/BenchmarkComparisonTable';
import { MetricRiskTable } from '../../features/reports/components/MetricRiskTable';
import { ReportExportActions } from '../../features/reports/components/ReportExportActions';
import { ReportManufacturingPanel } from '../../features/reports/components/ReportManufacturingPanel';
import { ReportRecipePanel } from '../../features/reports/components/ReportRecipePanel';
import { ReportRiskPanel } from '../../features/reports/components/ReportRiskPanel';
import { formatReportValue, reportStyles } from '../../features/reports/components/reportFormat';
import { ReportSummaryCards } from '../../features/reports/components/ReportSummaryCards';
import {
  generateRunReport,
  getReport,
  getRunReport,
  regenerateRunReport,
  type GeneratedReportRecord,
} from '../../services/api';
import { spacing } from '../../theme/tokens';

export function ReportDetailPage({
  onBack,
  productionRunId,
  reportId,
}: {
  onBack: () => void;
  productionRunId?: string;
  reportId?: string;
}) {
  const [record, setRecord] = useState<GeneratedReportRecord | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    const request = reportId ? getReport(reportId) : productionRunId ? getRunReport(productionRunId) : Promise.resolve(null);
    void request
      .then(setRecord)
      .catch((err: Error) => {
        setRecord(null);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [reportId, productionRunId]);

  const generate = async (regenerate = false) => {
    if (!productionRunId && !record?.productionRunId) return;
    try {
      const next = regenerate
        ? await regenerateRunReport(productionRunId ?? record?.productionRunId ?? '')
        : await generateRunReport(productionRunId ?? record?.productionRunId ?? '');
      setRecord(next);
      setError('');
      setMessage(regenerate ? 'Report regenerated' : 'Report generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
    }
  };

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={reportStyles.header}>
          <div>
            <button onClick={onBack} style={controlStyles.subtleButton} type="button">Back</button>
            <h1 style={{ ...reportStyles.title, marginTop: spacing.space4 }}>{record?.reportName ?? 'Report'}</h1>
            <p style={reportStyles.subtitle}>{record ? `${record.runCode} | ${record.formulation}` : 'Generate or open a saved report.'}</p>
          </div>
          {record && (
            <ReportExportActions
              onRegenerate={() => void generate(true)}
              reportId={record.id}
              runId={record.productionRunId}
            />
          )}
        </div>
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {message && <MessageBanner tone="success">{message}</MessageBanner>}
        {loading && <div style={reportStyles.muted}>Loading...</div>}
        {!loading && !record && (
          <div style={reportStyles.stack}>
            <EmptyState>No report snapshot found.</EmptyState>
            {productionRunId && <button onClick={() => void generate(false)} style={controlStyles.primaryButton} type="button">Generate Report</button>}
          </div>
        )}
        {record && <ReportSections record={record} />}
      </Card>
    </DashboardPage>
  );
}

function ReportSections({ record }: { record: GeneratedReportRecord }) {
  const snapshot = record.reportSnapshot;
  return (
    <div style={reportStyles.stack}>
      <Section title="Executive Summary">
        <ReportSummaryCards summary={snapshot.executiveSummary} />
      </Section>
      <Section title="Benchmark Similarity">
        <BenchmarkComparisonTable rows={snapshot.benchmarkComparison} />
      </Section>
      <Section title="Predictability Index">
        <div style={reportStyles.panel}>{formatReportValue(snapshot.executiveSummary['predictabilityIndex'])}</div>
      </Section>
      <Section title="Production Readiness">
        <div style={reportStyles.panel}>{formatReportValue(snapshot.executiveSummary['productionReadiness'])}</div>
      </Section>
      <Section title="Metric Breakdown">
        <MetricRiskTable rows={snapshot.metricBreakdown} />
      </Section>
      <Section title="Key Risks">
        <ReportRiskPanel risks={snapshot.keyRisks} />
      </Section>
      <Section title="Lab Test Results">
        {snapshot.labTestResults.length === 0 ? <EmptyState>No lab test results.</EmptyState> : <LabResults rows={snapshot.labTestResults} />}
      </Section>
      <Section title="Manufacturing Parameters">
        <ReportManufacturingPanel data={snapshot.manufacturingParameters} />
      </Section>
      {snapshot.processSetup && <Section title="Detailed Process Setup"><ProcessSetupReport data={snapshot.processSetup} /></Section>}
      <Section title="Formulation Recipe">
        <ReportRecipePanel rows={snapshot.formulationRecipe} />
      </Section>
      <Section title="Recommendations Placeholder">
        <div style={reportStyles.panel}>{snapshot.recommendations[0] ?? snapshot.recommendationsPlaceholder}</div>
      </Section>
    </div>
  );
}

function ProcessSetupReport({ data }: { data: Record<string, unknown> }) {
  const values = Array.isArray(data['values']) ? data['values'] as Record<string, unknown>[] : [];
  if (values.length === 0) return <EmptyState>No imported process setup.</EmptyState>;
  return (
    <div style={reportStyles.tableWrap}>
      <table style={reportStyles.table}>
        <thead><tr>{['Section', 'Parameter', 'Position', 'Setpoint', 'Actual', 'Unit'].map((column) => <th key={column} style={reportStyles.th}>{column}</th>)}</tr></thead>
        <tbody>{values.map((value, index) => <tr key={index}><td style={reportStyles.td}>{formatReportValue(value['section'])}</td><td style={reportStyles.td}>{formatReportValue(value['displayName'])}</td><td style={reportStyles.td}>{formatReportValue(value['positionLabel'] ?? value['positionIndex'])}</td><td style={reportStyles.td}>{formatReportValue(value['setpointNumeric'] ?? value['setpointText'] ?? value['setpointDate'])}</td><td style={reportStyles.td}>{formatReportValue(value['actualNumeric'] ?? value['actualText'] ?? value['actualDate'])}</td><td style={reportStyles.td}>{formatReportValue(value['unit'])}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function LabResults({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <div style={reportStyles.tableWrap}>
      <table style={reportStyles.table}>
        <thead>
          <tr>
            {['Sample', 'Metric', 'Category', 'Value', 'Unit', 'Condition'].map((column) => <th key={column} style={reportStyles.th}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${String(row['sampleCode'] ?? row['metricName'])}-${index}`}>
              <td style={reportStyles.td}>{formatReportValue(row['sampleCode'])}</td>
              <td style={reportStyles.td}>{formatReportValue(row['metricName'])}</td>
              <td style={reportStyles.td}>{formatReportValue(row['category'])}</td>
              <td style={reportStyles.td}>{formatReportValue(row['value'] ?? row['meanValue'])}</td>
              <td style={reportStyles.td}>{formatReportValue(row['unit'])}</td>
              <td style={reportStyles.td}>{formatReportValue(row['conditionName'])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section style={reportStyles.stack}>
      <h2 style={reportStyles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}
