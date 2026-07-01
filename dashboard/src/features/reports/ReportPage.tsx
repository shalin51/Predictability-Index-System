import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  getFormulation,
  getReport,
  type FormulationDetail,
  type GeneratedReportDto,
} from '../../services/api';
import { colors, font, radius, spacing } from '../../theme/tokens';

interface ReportPageProps {
  formulationId: string;
  onBack: () => void;
}

export function ReportPage({ formulationId, onBack }: ReportPageProps) {
  const [formulation, setFormulation] = useState<FormulationDetail | null>(null);
  const [report, setReport] = useState<GeneratedReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    void Promise.all([getFormulation(formulationId), getReport(formulationId)])
      .then(([formulationResult, reportResult]) => {
        setFormulation(formulationResult);
        setReport(reportResult);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [formulationId]);

  const download = () => {
    if (!report) {
      return;
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${report.formulationCode}-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardPage>
      <Card>
        <div style={styles.header}>
          <button onClick={onBack} style={controlStyles.secondaryButton} type="button">
            Back
          </button>
          <button disabled={!report} onClick={download} style={controlStyles.primaryButton} type="button">
            Download Report
          </button>
        </div>

        <h1 style={styles.title}>Formulation Report</h1>
        {formulation && (
          <p style={styles.subtitle}>
            {formulation.formulationCode}{formulation.producedDate ? ` · ${formulation.producedDate}` : ''}
          </p>
        )}

        <Divider />

        {loading && <div style={styles.muted}>Generating report...</div>}
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}

        {!loading && report && (
          <div style={styles.sections}>
            <div style={styles.summaryGrid}>
              <SummaryCard label="Predictability Score" value={String(report.executiveSummary.predictabilityScore)} />
              <SummaryCard label="Traffic Light" value={report.executiveSummary.trafficLight} />
              <SummaryCard label="Production Ready" value={report.executiveSummary.productionReady ? 'Yes' : 'No'} />
              <SummaryCard label="Generated" value={new Date(report.generatedAt).toLocaleString()} />
            </div>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Executive Summary</h2>
              <p style={styles.body}>{report.executiveSummary.verdict}</p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Top Risks</h2>
              <ul style={styles.list}>
                {report.executiveSummary.topRisks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Benchmark Comparison</h2>
              <div style={styles.rows}>
                {report.benchmarkResults.map((entry) => (
                  <div key={entry.benchmark.id} style={styles.rowCard}>
                    <div style={styles.rowTitle}>{entry.benchmark.name}</div>
                    <div style={styles.rowMeta}>Score {entry.scoreResult.overallScore.toFixed(1)} · {entry.scoreResult.trafficLight}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Recommendations</h2>
              <ul style={styles.list}>
                {report.recommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </Card>
    </DashboardPage>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  body: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    lineHeight: 1.6,
    margin: 0,
  },
  header: {
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  label: {
    color: colors.text.muted,
    fontSize: font.size.xs,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  list: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    margin: 0,
    paddingLeft: 20,
  },
  muted: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
  rowCard: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: `${spacing.md}px`,
  },
  rowMeta: {
    color: colors.text.secondary,
    fontSize: font.size.xs,
    marginTop: 6,
  },
  rows: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  rowTitle: {
    color: colors.text.primary,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: font.size.lg,
    margin: 0,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: font.size.md,
    margin: 0,
  },
  summaryCard: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: `${spacing.md}px`,
  },
  summaryGrid: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  title: {
    color: colors.text.primary,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    margin: `${spacing.md}px 0 4px`,
  },
  value: {
    color: colors.text.primary,
    fontSize: font.size.md,
    marginTop: 4,
  },
};
