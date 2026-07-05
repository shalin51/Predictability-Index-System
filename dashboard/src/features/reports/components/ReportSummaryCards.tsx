import { formatPercent, formatReportValue, formatScore, reportStyles, TrafficBadge } from './reportFormat';

export function ReportSummaryCards({ summary }: { summary: Record<string, unknown> }) {
  return (
    <div style={reportStyles.cardGrid}>
      <SummaryCard label="Formulation" value={formatReportValue(summary['formulation'])} />
      <SummaryCard label="Production Run" value={formatReportValue(summary['productionRun'])} />
      <SummaryCard label="Best Match" value={formatReportValue(summary['bestMatch'])} />
      <SummaryCard label="Predictability Index" value={formatScore(summary['predictabilityIndex'])} />
      <SummaryCard label="Franklin X-40 Similarity" value={formatPercent(summary['franklinX40Similarity'])} />
      <SummaryCard label="Lifetime Similarity" value={formatPercent(summary['lifetimeSimilarity'])} />
      <SummaryCard label="Production Readiness" value={formatPercent(summary['productionReadiness'])} />
      <div style={reportStyles.panel}>
        <div style={reportStyles.muted}>Traffic Light</div>
        <TrafficBadge value={summary['trafficLight'] as string} />
      </div>
      <SummaryCard label="Main Risk" value={formatReportValue(summary['mainRisk'])} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={reportStyles.panel}>
      <div style={reportStyles.muted}>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}
