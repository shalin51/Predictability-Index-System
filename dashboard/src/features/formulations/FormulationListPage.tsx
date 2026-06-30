import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import { StatusDot, type DotStatus } from '../../components/ui/StatusDot';
import { listFormulations, type FormulationListItem } from '../../services/api';
import { colors, font, spacing } from '../../theme/tokens';

const STATUS_COLOR: Record<string, DotStatus> = {
  draft: 'checking',
  testing: 'checking',
  approved: 'ok',
  rejected: 'error',
  archived: 'error',
};

export function FormulationListPage({
  onCreate,
  onSelect,
}: {
  onCreate?: () => void;
  onSelect?: (id: string) => void;
}) {
  const [data, setData] = useState<FormulationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    void listFormulations(page, 10)
      .then((response) => {
        setData(response.data);
        setTotal(response.total);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <DashboardPage>
      <Card>
        <div style={styles.header}>
          <h1 style={styles.title}>Formulations</h1>
          <div style={styles.headerMeta}>
            <span style={styles.total}>{total} total</span>
            {onCreate && (
              <button onClick={onCreate} style={controlStyles.primaryButton} type="button">
                New
              </button>
            )}
          </div>
        </div>
        <Divider />

        {loading && <div style={styles.muted}>Loading...</div>}
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}

        {!loading && data.length === 0 && <EmptyState>No formulations yet.</EmptyState>}

        {data.map((formulation) => (
          <div
            key={formulation.id}
            onClick={() => onSelect?.(formulation.id)}
            style={{
              ...styles.row,
              cursor: onSelect ? 'pointer' : 'default',
            }}
          >
            <div>
              <div style={styles.code}>{formulation.formulationCode}</div>
              <div style={styles.name}>{formulation.name}</div>
            </div>
            <div style={styles.rowMeta}>
              <span style={styles.date}>{formulation.producedDate?.split('T')[0] ?? '—'}</span>
              <StatusDot size={10} status={STATUS_COLOR[formulation.status] ?? 'checking'} />
              <span style={styles.status}>{formulation.status}</span>
            </div>
          </div>
        ))}

        {total > 10 && (
          <>
            <Divider />
            <div style={styles.pagination}>
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                style={styles.paginationButton}
                type="button"
              >
                Prev
              </button>
              <span style={styles.total}>
                {page} / {Math.ceil(total / 10)}
              </span>
              <button
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= Math.ceil(total / 10)}
                style={styles.paginationButton}
                type="button"
              >
                Next
              </button>
            </div>
          </>
        )}
      </Card>
    </DashboardPage>
  );
}

const styles: Record<string, CSSProperties> = {
  code: {
    color: colors.text.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  date: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  headerMeta: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing.sm,
  },
  muted: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
  name: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
  },
  pagination: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  paginationButton: {
    ...controlStyles.secondaryButton,
    padding: '5px 12px',
  },
  row: {
    alignItems: 'center',
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    padding: `${spacing.sm}px 0`,
  },
  rowMeta: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing.sm,
  },
  status: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    textTransform: 'capitalize',
  },
  title: {
    color: colors.text.primary,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    margin: 0,
  },
  total: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
};
