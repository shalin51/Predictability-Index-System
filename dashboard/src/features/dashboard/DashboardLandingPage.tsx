import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import { listBenchmarks, listFormulations } from '../../services/api';
import { colors, font, spacing } from '../../theme/tokens';

interface DashboardLandingPageProps {
  onOpenBenchmarks: () => void;
  onOpenFormulations: () => void;
}

interface DashboardCounts {
  benchmarkCount: number;
  formulationCount: number;
  loading: boolean;
  error: string;
}

const EMPTY_COUNTS: DashboardCounts = {
  benchmarkCount: 0,
  error: '',
  formulationCount: 0,
  loading: true,
};

export function DashboardLandingPage({
  onOpenBenchmarks,
  onOpenFormulations,
}: DashboardLandingPageProps) {
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setCounts((current) => ({ ...current, error: '', loading: true }));

      try {
        const [formulationResponse, benchmarks] = await Promise.all([
          listFormulations(1, 24),
          listBenchmarks(),
        ]);

        if (cancelled) {
          return;
        }

        setCounts({
          benchmarkCount: benchmarks.length,
          error: '',
          formulationCount: formulationResponse.total,
          loading: false,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCounts({
          ...EMPTY_COUNTS,
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

  return (
    <DashboardPage maxWidth={960}>
      {counts.error && <MessageBanner tone="danger">{counts.error}</MessageBanner>}
      <div style={styles.grid}>
        <MetricTile
          actionLabel="Open formulations"
          count={counts.formulationCount}
          loading={counts.loading}
          onClick={onOpenFormulations}
          title="Number of formulations"
        />
        <MetricTile
          actionLabel="Open benchmarks"
          count={counts.benchmarkCount}
          loading={counts.loading}
          onClick={onOpenBenchmarks}
          title="Number of benchmarks"
        />
      </div>
    </DashboardPage>
  );
}

function MetricTile({
  actionLabel,
  count,
  loading,
  onClick,
  title,
}: {
  actionLabel: string;
  count: number;
  loading: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <Card style={styles.tile}>
      <div style={styles.tileLabel}>{title}</div>
      <div style={styles.tileValue}>{loading ? '...' : String(count)}</div>
      <button onClick={onClick} style={styles.tileButton} type="button">
        {actionLabel}
      </button>
    </Card>
  );
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: 'grid',
    gap: spacing.lg,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    minHeight: 220,
    justifyContent: 'space-between',
  },
  tileButton: {
    backgroundColor: colors.text.primary,
    border: 'none',
    color: colors.bg,
    cursor: 'pointer',
    fontFamily: font.family,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    padding: '12px 16px',
  },
  tileLabel: {
    color: colors.text.muted,
    fontSize: font.size.sm,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  tileValue: {
    color: colors.text.primary,
    fontSize: '4rem',
    fontWeight: font.weight.bold,
    lineHeight: 1,
  },
};
