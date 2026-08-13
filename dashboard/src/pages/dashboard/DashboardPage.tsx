import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { DashboardPage as PageFrame, MessageBanner } from '../../components/ui/Page';
import { BenchmarkOverviewWidget } from '../../features/dashboard/components/BenchmarkOverviewWidget';
import { DashboardKpiCards } from '../../features/dashboard/components/DashboardKpiCards';
import { dashboardStyles } from '../../features/dashboard/components/dashboardFormat';
import { LabQueueWidget } from '../../features/dashboard/components/LabQueueWidget';
import { LatestScoresWidget } from '../../features/dashboard/components/LatestScoresWidget';
import { NeedsAttentionPanel } from '../../features/dashboard/components/NeedsAttentionPanel';
import { RecentReportsWidget } from '../../features/dashboard/components/RecentReportsWidget';
import { RiskAlertsWidget } from '../../features/dashboard/components/RiskAlertsWidget';
import { WorkflowStatusPanel } from '../../features/dashboard/components/WorkflowStatusPanel';
import { PredictiveIndexPanel } from '../../features/dashboard/components/PredictiveIndexPanel';
import { getDashboardOverview, type DashboardOverview } from '../../services/api';

export function DashboardHomePage({
  autoRefresh = false,
  onOpenLabRun,
  onOpenProductionRun,
  onOpenReport,
}: {
  autoRefresh?: boolean;
  onOpenLabRun: (id: string) => void;
  onOpenProductionRun: (id: string) => void;
  onOpenReport: (id: string) => void;
}) {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    void getDashboardOverview()
      .then((nextData) => {
        setData(nextData);
        setLastUpdated(new Date());
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const intervalId = window.setInterval(() => load(false), 60_000);
    return () => window.clearInterval(intervalId);
  }, [autoRefresh, load]);

  const hasOperationalData = data ? hasDashboardData(data) : false;

  return (
    <PageFrame maxWidth="100%">
      <div style={dashboardStyles.stack}>
        <div style={dashboardStyles.header}>
          <div>
            <h1 style={dashboardStyles.title}>Dashboard</h1>
            <p style={dashboardStyles.subtitle}>Operating view for formulations, lab work, scoring, risks, and reports.</p>
          </div>
          <div className="dashboard-refresh">
            {lastUpdated && <span style={dashboardStyles.muted}>Updated {formatUpdateTime(lastUpdated)}</span>}
            <Button disabled={loading} onClick={() => load()} size="sm" variant="secondary">Refresh</Button>
          </div>
        </div>
        {error && (
          <MessageBanner tone="danger">
            <div style={dashboardStyles.header}>
              <span>{error}</span>
              <Button onClick={() => load()} size="sm" variant="secondary">Retry</Button>
            </div>
          </MessageBanner>
        )}
        {loading && !data && <div className="dashboard-loading" aria-label="Loading dashboard" />}
        <PredictiveIndexPanel />
        {data && hasOperationalData && (
          <div style={dashboardStyles.stack}>
            <Section title="Needs Attention">
              <NeedsAttentionPanel riskAlertCount={data.riskAlerts.length} summary={data.summary} />
            </Section>
            <Section title="Work Summary">
              <DashboardKpiCards riskAlertCount={data.riskAlerts.length} summary={data.summary} />
            </Section>
            <Section title="Workflow Inventory">
              <WorkflowStatusPanel rows={data.workflowStatus} />
            </Section>
            <div className="dashboard-two-column-grid">
              <Section title="Lab Testing Queue">
                <LabQueueWidget onOpen={onOpenLabRun} rows={data.labQueue} />
              </Section>
              <Section title="Latest Scored Runs">
                <LatestScoresWidget onOpenReport={onOpenReport} onOpenRun={onOpenProductionRun} rows={data.latestScores} />
              </Section>
            </div>
            {data.benchmarkOverview.bestMatchCounts.length > 0 && (
              <Section title="Best Match Distribution">
                <BenchmarkOverviewWidget overview={data.benchmarkOverview} />
              </Section>
            )}
            <div className="dashboard-two-column-grid">
              <Section title="Risk Alerts">
                <RiskAlertsWidget onOpenRun={onOpenProductionRun} rows={data.riskAlerts} />
              </Section>
              <Section title="Recent Reports">
                <RecentReportsWidget onOpen={onOpenReport} rows={data.recentReports} />
              </Section>
            </div>
          </div>
        )}
      </div>
    </PageFrame>
  );
}

function formatUpdateTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(value);
}

function hasDashboardData(data: DashboardOverview) {
  const summaryTotal = Object.values(data.summary).reduce((total, count) => total + count, 0);
  return summaryTotal > 0
    || data.labQueue.length > 0
    || data.latestScores.length > 0
    || data.recentReports.length > 0
    || data.riskAlerts.length > 0;
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section style={dashboardStyles.stack}>
      <h2 style={dashboardStyles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}
