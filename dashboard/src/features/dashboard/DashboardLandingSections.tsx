import { Card } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { EmptyState, MessageBanner, SectionHeading } from '../../components/ui/Page';
import { StatusDot, type DotStatus } from '../../components/ui/StatusDot';
import type { BenchmarkItem, FormulationListItem, ScoreResult } from '../../services/api';
import { dashboardLandingStyles, trafficLightStyles } from './dashboardLandingStyles';

export interface AnalysisSpotlight {
  formulation: FormulationListItem;
  bestScore: ScoreResult | null;
}

export interface DashboardLandingMetrics {
  averageScore: number;
  productionReadyRatio: number | null;
}

export function DashboardHero({
  appEnv,
  apiStatus,
  dbStatus,
  lastCheckedLabel,
  liveTimestamp,
  onOpenAnalysis,
  onOpenBenchmarks,
  onOpenFormulations,
}: {
  appEnv: string;
  apiStatus: 'checking' | 'offline' | 'online';
  dbStatus: 'checking' | 'connected' | 'failed';
  lastCheckedLabel: string;
  liveTimestamp: string;
  onOpenAnalysis: () => void;
  onOpenBenchmarks: () => void;
  onOpenFormulations: () => void;
}) {
  return (
    <section style={dashboardLandingStyles.hero}>
      <div style={dashboardLandingStyles.heroCopy}>
        <div style={dashboardLandingStyles.kicker}>Predictability Index</div>
        <h1 style={dashboardLandingStyles.heroTitle}>Landing dashboard for formulation flow, benchmark coverage, and lab activity.</h1>
        <p style={dashboardLandingStyles.heroText}>
          Track how many formulations are active, how benchmark packs are performing, and where approvals are slowing down.
        </p>
        <div style={dashboardLandingStyles.heroActions}>
          <button onClick={onOpenFormulations} style={controlStyles.primaryButton} type="button">
            Open formulations
          </button>
          <button onClick={onOpenBenchmarks} style={controlStyles.secondaryButton} type="button">
            Review benchmarks
          </button>
          <button onClick={onOpenAnalysis} style={controlStyles.secondaryButton} type="button">
            Run analysis
          </button>
        </div>
      </div>

      <div style={dashboardLandingStyles.heroPanel}>
        <div style={dashboardLandingStyles.panelEyebrow}>Live snapshot</div>
        <div style={dashboardLandingStyles.panelGrid}>
          <LiveChip label="Environment" value={appEnv} />
          <LiveChip
            label="API"
            status={apiStatus === 'online' ? 'ok' : apiStatus === 'offline' ? 'error' : 'checking'}
            value={apiStatus}
          />
          <LiveChip
            label="Database"
            status={dbStatus === 'connected' ? 'ok' : dbStatus === 'failed' ? 'error' : 'checking'}
            value={dbStatus}
          />
          <LiveChip label="Last sync" value={lastCheckedLabel} />
        </div>
        <div style={dashboardLandingStyles.panelFooter}>Server clock: {liveTimestamp}</div>
      </div>
    </section>
  );
}

export function DashboardMetricGrid({
  benchmarkCount,
  formulationCount,
  loading,
  productionReadyRatio,
}: {
  benchmarkCount: number;
  formulationCount: number;
  loading: boolean;
  productionReadyRatio: number | null;
}) {
  return (
    <section style={dashboardLandingStyles.metricGrid}>
      <MetricCard caption="Total records in workspace" label="Formulations" loading={loading} value={String(formulationCount)} />
      <MetricCard caption="Benchmark profiles available" label="Benchmarks" loading={loading} value={String(benchmarkCount)} />
      <MetricCard
        caption="Recent analyses marked production ready"
        label="Success ratio"
        loading={loading}
        value={productionReadyRatio == null ? '—' : `${productionReadyRatio}%`}
      />
      <MetricCard caption="Formulation records currently tracked" label="Tracked records" loading={loading} value={String(formulationCount)} />
    </section>
  );
}

export function DashboardContentGrid({
  benchmarkCoverage,
  benchmarks,
  heartbeatIssues,
  metrics,
  onOpenAnalysis,
  onOpenBenchmarks,
  onOpenFormulations,
  recentFormulations,
  snapshotLoading,
  spotlight,
  systemStatus,
}: {
  benchmarkCoverage: number;
  benchmarks: BenchmarkItem[];
  heartbeatIssues: string[];
  metrics: DashboardLandingMetrics;
  onOpenAnalysis: () => void;
  onOpenBenchmarks: () => void;
  onOpenFormulations: () => void;
  recentFormulations: FormulationListItem[];
  snapshotLoading: boolean;
  spotlight: AnalysisSpotlight[];
  systemStatus: {
    apiStatus: 'checking' | 'offline' | 'online';
    appEnv: string;
    dbStatus: 'checking' | 'connected' | 'failed';
    lastCheckedLabel: string;
  };
}) {
  return (
    <div style={dashboardLandingStyles.contentGrid}>
      <Card style={dashboardLandingStyles.sectionCard}>
        <SectionHeading
          action={<button onClick={onOpenFormulations} style={controlStyles.secondaryButton} type="button">Formulations</button>}
          title="Formulation workflow"
        />
        <div style={dashboardLandingStyles.activityList}>
          {recentFormulations.length === 0 && !snapshotLoading && <EmptyState>No formulation activity yet.</EmptyState>}
          {recentFormulations.map((formulation) => (
            <div key={formulation.id} style={dashboardLandingStyles.activityRow}>
              <div>
                <div style={dashboardLandingStyles.activityTitle}>{formulation.formulationCode}</div>
                <div style={dashboardLandingStyles.activityText}>Formulation record</div>
              </div>
              <div style={dashboardLandingStyles.activityMeta}>
                <span style={dashboardLandingStyles.activityDate}>{formatDate(formulation.producedDate)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={dashboardLandingStyles.sectionCard}>
        <SectionHeading
          action={<button onClick={onOpenBenchmarks} style={controlStyles.secondaryButton} type="button">Benchmarks</button>}
          title="Benchmark coverage"
        />
        <div style={dashboardLandingStyles.coverageHero}>
          <div>
            <div style={dashboardLandingStyles.coverageValue}>{snapshotLoading ? '…' : benchmarkCoverage}</div>
            <div style={dashboardLandingStyles.coverageLabel}>configured metric targets across active benchmark packs</div>
          </div>
          <div style={dashboardLandingStyles.coverageStat}>
            <span style={dashboardLandingStyles.coverageMiniLabel}>Average score</span>
            <span style={dashboardLandingStyles.coverageMiniValue}>
              {snapshotLoading || spotlight.length === 0 ? '—' : metrics.averageScore.toFixed(1)}
            </span>
          </div>
        </div>
        <div style={dashboardLandingStyles.benchmarkList}>
          {benchmarks.map((benchmark) => (
            <div key={benchmark.id} style={dashboardLandingStyles.benchmarkRow}>
              <div>
                <div style={dashboardLandingStyles.activityTitle}>{benchmark.name}</div>
                <div style={dashboardLandingStyles.activityText}>{benchmark.metricCount} metrics in profile</div>
              </div>
              <div style={dashboardLandingStyles.metricTag}>{benchmark.metricCount}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={dashboardLandingStyles.sectionCard}>
        <SectionHeading
          action={<button onClick={onOpenAnalysis} style={controlStyles.secondaryButton} type="button">Analysis</button>}
          title="Success spotlight"
        />
        <div style={dashboardLandingStyles.spotlightList}>
          {spotlight.length === 0 && !snapshotLoading && (
            <EmptyState>Run analysis on tested formulations to populate this panel.</EmptyState>
          )}
          {spotlight.map((item) => (
            <div key={item.formulation.id} style={dashboardLandingStyles.spotlightRow}>
              <div>
                <div style={dashboardLandingStyles.activityTitle}>{item.formulation.formulationCode}</div>
                <div style={dashboardLandingStyles.activityText}>
                  {item.bestScore?.benchmarkSimilarity.benchmarkName ?? 'No benchmark match yet'}
                </div>
              </div>
              <div style={dashboardLandingStyles.spotlightScore}>
                <span style={dashboardLandingStyles.spotLightValue}>
                  {item.bestScore ? item.bestScore.overallScore.toFixed(1) : '—'}
                </span>
                <span
                  style={{
                    ...dashboardLandingStyles.trafficLight,
                    ...(item.bestScore ? trafficLightStyles[item.bestScore.trafficLight] : trafficLightStyles.red),
                  }}
                >
                  {item.bestScore?.trafficLight ?? 'red'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={dashboardLandingStyles.sectionCard}>
        <SectionHeading title="System pulse" />
        <div style={dashboardLandingStyles.systemGrid}>
          <SystemRow
            label="API health"
            status={systemStatus.apiStatus === 'online' ? 'ok' : systemStatus.apiStatus === 'offline' ? 'error' : 'checking'}
            value={systemStatus.apiStatus}
          />
          <SystemRow
            label="Database"
            status={systemStatus.dbStatus === 'connected' ? 'ok' : systemStatus.dbStatus === 'failed' ? 'error' : 'checking'}
            value={systemStatus.dbStatus}
          />
          <SystemRow label="Environment" value={systemStatus.appEnv} />
          <SystemRow label="Last check" value={systemStatus.lastCheckedLabel} />
        </div>
        {heartbeatIssues.length > 0 && (
          <div style={dashboardLandingStyles.systemErrors}>
            {heartbeatIssues.map((issue) => (
              <div key={issue} style={dashboardLandingStyles.systemErrorText}>{issue}</div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function DashboardError({ message }: { message: string }) {
  return <MessageBanner tone="danger">{message}</MessageBanner>;
}

function MetricCard({
  caption,
  label,
  loading,
  value,
}: {
  caption: string;
  label: string;
  loading: boolean;
  value: string;
}) {
  return (
    <div style={dashboardLandingStyles.metricCard}>
      <div style={dashboardLandingStyles.metricLabel}>{label}</div>
      <div style={dashboardLandingStyles.metricValue}>{loading ? '…' : value}</div>
      <div style={dashboardLandingStyles.metricCaption}>{caption}</div>
    </div>
  );
}

function LiveChip({
  label,
  status,
  value,
}: {
  label: string;
  status?: DotStatus;
  value: string;
}) {
  return (
    <div style={dashboardLandingStyles.liveChip}>
      <div style={dashboardLandingStyles.liveChipLabel}>{label}</div>
      <div style={dashboardLandingStyles.liveChipValue}>
        {status && <StatusDot size={10} status={status} />}
        {value}
      </div>
    </div>
  );
}

function SystemRow({
  label,
  status,
  value,
}: {
  label: string;
  status?: DotStatus;
  value: string;
}) {
  return (
    <div style={dashboardLandingStyles.systemRow}>
      <span style={dashboardLandingStyles.systemLabel}>{label}</span>
      <span style={dashboardLandingStyles.systemValue}>
        {status && <StatusDot size={10} status={status} />}
        {value}
      </span>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return 'No date';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}
