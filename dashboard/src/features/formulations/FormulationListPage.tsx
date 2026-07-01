import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import { listFormulations, type FormulationListItem } from '../../services/api';
import { colors, font, radius, spacing } from '../../theme/tokens';

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
    <DashboardPage maxWidth={1200}>
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

        {!loading && data.length > 0 && (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Produced Date</th>
                  <th style={styles.th}>Record ID</th>
                </tr>
              </thead>
              <tbody>
                {data.map((formulation) => (
                  <tr
                    key={formulation.id}
                    onClick={() => onSelect?.(formulation.id)}
                    style={{
                      ...styles.tableRow,
                      cursor: onSelect ? 'pointer' : 'default',
                    }}
                  >
                    <td style={styles.tdStrong}>{formulation.formulationCode}</td>
                    <td style={styles.td}>{formatDate(formulation.producedDate)}</td>
                    <td style={styles.td}>{formulation.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

function formatDate(value?: string) {
  return value?.split('T')[0] ?? '—';
}

const styles: Record<string, CSSProperties> = {
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
  table: {
    borderCollapse: 'collapse',
    minWidth: 720,
    width: '100%',
  },
  tableRow: {
    borderBottom: `1px solid ${colors.border}`,
  },
  tableWrap: {
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    overflow: 'auto',
  },
  td: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    padding: `${spacing.sm}px ${spacing.md}px`,
  },
  tdStrong: {
    color: colors.text.primary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    padding: `${spacing.sm}px ${spacing.md}px`,
  },
  th: {
    backgroundColor: colors.surfaceElevated,
    color: colors.text.muted,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    letterSpacing: '0.08em',
    padding: `${spacing.sm}px ${spacing.md}px`,
    textAlign: 'left',
    textTransform: 'uppercase',
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
