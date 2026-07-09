import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { DashboardPage as PageFrame, MessageBanner } from '../../components/ui/Page';
import { BenchmarkOverviewWidget } from '../../features/dashboard/components/BenchmarkOverviewWidget';
import { DashboardKpiCards } from '../../features/dashboard/components/DashboardKpiCards';
import { dashboardStyles } from '../../features/dashboard/components/dashboardFormat';
import { LabQueueWidget } from '../../features/dashboard/components/LabQueueWidget';
import { LatestScoresWidget } from '../../features/dashboard/components/LatestScoresWidget';
import { RecentReportsWidget } from '../../features/dashboard/components/RecentReportsWidget';
import { RiskAlertsWidget } from '../../features/dashboard/components/RiskAlertsWidget';
import { WorkflowStatusPanel } from '../../features/dashboard/components/WorkflowStatusPanel';
import { getDashboardOverview, type DashboardOverview } from '../../services/api';

export function DashboardHomePage({
  onOpenLabRun,
  onOpenProductionRun,
  onOpenReport,
}: {
  onOpenLabRun: (id: string) => void;
  onOpenProductionRun: (id: string) => void;
  onOpenReport: (id: string) => void;
}) {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    void getDashboardOverview()
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <PageFrame maxWidth="100%">
      <Card>
        <div style={dashboardStyles.header}>
          <div>
            <h1 style={dashboardStyles.title}>Dashboard</h1>
            <p style={dashboardStyles.subtitle}>Operating view for formulations, lab work, scoring, risks, and reports.</p>
          </div>
        </div>
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {loading && <div style={dashboardStyles.muted}>Loading...</div>}
        {data && (
          <div style={dashboardStyles.stack}>
            <Section title="KPI Summary">
              <DashboardKpiCards summary={data.summary} />
            </Section>
            <Section title="Active Workflow">
              <WorkflowStatusPanel rows={data.workflowStatus} />
            </Section>
            <div style={dashboardStyles.gridTwo}>
              <Section title="Lab Testing Queue">
                <LabQueueWidget onOpen={onOpenLabRun} rows={data.labQueue} />
              </Section>
              <Section title="Latest Scored Runs">
                <LatestScoresWidget onOpenReport={onOpenReport} onOpenRun={onOpenProductionRun} rows={data.latestScores} />
              </Section>
            </div>
            <Section title="Benchmark Similarity Overview">
              <BenchmarkOverviewWidget overview={data.benchmarkOverview} />
            </Section>
            <div style={dashboardStyles.gridTwo}>
              <Section title="Risk Alerts">
                <RiskAlertsWidget onOpenRun={onOpenProductionRun} rows={data.riskAlerts} />
              </Section>
              <Section title="Recent Reports">
                <RecentReportsWidget onOpen={onOpenReport} rows={data.recentReports} />
              </Section>
            </div>
          </div>
        )}
      </Card>
    </PageFrame>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section style={dashboardStyles.stack}>
      <h2 style={dashboardStyles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}
