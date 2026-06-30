import { useEffect, useMemo, useState } from 'react';
import { DashboardPage } from '../../components/ui/Page';
import {
  listBenchmarks,
  listFormulations,
  scoreAllBenchmarks,
  type BenchmarkItem,
  type FormulationListItem,
} from '../../services/api';
import { useHeartbeat } from '../heartbeat/useHeartbeat';
import {
  AnalysisSpotlight,
  DashboardContentGrid,
  DashboardError,
  DashboardHero,
  DashboardMetricGrid,
  type DashboardLandingMetrics,
} from './DashboardLandingSections';
import { dashboardLandingStyles } from './dashboardLandingStyles';

interface DashboardLandingPageProps {
  onOpenAnalysis: () => void;
  onOpenBenchmarks: () => void;
  onOpenFormulations: () => void;
}

interface DashboardSnapshot {
  benchmarks: BenchmarkItem[];
  formulations: FormulationListItem[];
  loading: boolean;
  error: string;
  spotlight: AnalysisSpotlight[];
}

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  benchmarks: [],
  error: '',
  formulations: [],
  loading: true,
  spotlight: [],
};

export function DashboardLandingPage({
  onOpenAnalysis,
  onOpenBenchmarks,
  onOpenFormulations,
}: DashboardLandingPageProps) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_SNAPSHOT);
  const { apiError, apiStatus, appEnv, dbError, dbStatus, lastChecked, serverTimestamp } = useHeartbeat();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setSnapshot((current) => ({ ...current, error: '', loading: true }));

      try {
        const [formulationResponse, benchmarks] = await Promise.all([
          listFormulations(1, 24),
          listBenchmarks(),
        ]);

        const formulations = formulationResponse.data;
        const candidates = formulations
          .filter((formulation) => formulation.status !== 'draft')
          .slice(0, 6);

        const settled = await Promise.allSettled(
          candidates.map(async (formulation) => {
            const scores = await scoreAllBenchmarks(formulation.id);
            const bestScore = scores.slice().sort((left, right) => right.overallScore - left.overallScore)[0] ?? null;
            return { bestScore, formulation };
          }),
        );

        if (cancelled) {
          return;
        }

        setSnapshot({
          benchmarks,
          error: '',
          formulations,
          loading: false,
          spotlight: settled.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSnapshot({
          ...EMPTY_SNAPSHOT,
          error: error instanceof Error ? error.message : 'Unable to load dashboard data.',
          loading: false,
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo<DashboardLandingMetrics>(() => {
    const statusCounts = snapshot.formulations.reduce<Record<string, number>>((counts, formulation) => {
      counts[formulation.status] = (counts[formulation.status] ?? 0) + 1;
      return counts;
    }, {});

    const assessed = snapshot.spotlight.filter((item) => item.bestScore);
    const productionReady = assessed.filter((item) => item.bestScore?.productionReady).length;
    const averageScore = assessed.length > 0
      ? assessed.reduce((total, item) => total + (item.bestScore?.overallScore ?? 0), 0) / assessed.length
      : 0;

    return {
      approved: statusCounts.approved ?? 0,
      averageScore,
      pending: (statusCounts.draft ?? 0) + (statusCounts.testing ?? 0),
      productionReadyRatio: assessed.length > 0 ? Math.round((productionReady / assessed.length) * 100) : null,
      rejected: (statusCounts.rejected ?? 0) + (statusCounts.archived ?? 0),
      statusCounts,
    };
  }, [snapshot.formulations, snapshot.spotlight]);

  const recentFormulations = snapshot.formulations.slice(0, 5);
  const benchmarkCoverage = snapshot.benchmarks.reduce((total, benchmark) => total + benchmark.metricCount, 0);
  const liveTimestamp = serverTimestamp !== '—' ? new Date(serverTimestamp).toLocaleString() : 'Awaiting sync';
  const lastCheckedLabel = lastChecked ? lastChecked.toLocaleTimeString() : 'Pending';
  const heartbeatIssues = [apiError, dbError].filter(Boolean) as string[];

  return (
    <DashboardPage>
      <div style={dashboardLandingStyles.page}>
        <DashboardHero
          appEnv={appEnv}
          apiStatus={apiStatus}
          dbStatus={dbStatus}
          lastCheckedLabel={lastCheckedLabel}
          liveTimestamp={liveTimestamp}
          onOpenAnalysis={onOpenAnalysis}
          onOpenBenchmarks={onOpenBenchmarks}
          onOpenFormulations={onOpenFormulations}
        />

        <DashboardMetricGrid
          benchmarkCount={snapshot.benchmarks.length}
          formulationCount={snapshot.formulations.length}
          loading={snapshot.loading}
          pending={metrics.pending}
          productionReadyRatio={metrics.productionReadyRatio}
        />

        {snapshot.error && <DashboardError message={snapshot.error} />}

        <DashboardContentGrid
          benchmarkCoverage={benchmarkCoverage}
          benchmarks={snapshot.benchmarks}
          heartbeatIssues={heartbeatIssues}
          metrics={metrics}
          onOpenAnalysis={onOpenAnalysis}
          onOpenBenchmarks={onOpenBenchmarks}
          onOpenFormulations={onOpenFormulations}
          recentFormulations={recentFormulations}
          snapshotLoading={snapshot.loading}
          spotlight={snapshot.spotlight}
          systemStatus={{
            apiStatus,
            appEnv,
            dbStatus,
            lastCheckedLabel,
          }}
        />
      </div>
    </DashboardPage>
  );
}
