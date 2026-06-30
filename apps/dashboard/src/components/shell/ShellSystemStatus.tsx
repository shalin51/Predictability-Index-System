import type { CSSProperties } from 'react';
import { StatusDot, type DotStatus } from '../ui/StatusDot';
import { useHeartbeat } from '../../features/heartbeat/useHeartbeat';
import { colors, font, radius, spacing } from '../../theme/tokens';

interface ShellSystemStatusProps {
  compact?: boolean;
  onOpenOverview: () => void;
}

export function ShellSystemStatus({ compact = false, onOpenOverview }: ShellSystemStatusProps) {
  const { apiStatus, dbStatus, appEnv, lastChecked } = useHeartbeat();

  const apiDot: DotStatus =
    apiStatus === 'checking' ? 'checking' : apiStatus === 'online' ? 'ok' : 'error';
  const dbDot: DotStatus =
    dbStatus === 'checking' ? 'checking' : dbStatus === 'connected' ? 'ok' : 'error';

  if (compact) {
    return (
      <button onClick={onOpenOverview} style={styles.compactCard} type="button">
        <div style={styles.compactDots}>
          <StatusDot size={10} status={apiDot} />
          <StatusDot size={10} status={dbDot} />
        </div>
        <div style={styles.compactLabel}>Pulse</div>
      </button>
    );
  }

  return (
    <button onClick={onOpenOverview} style={styles.card} type="button">
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>System status</div>
          <div style={styles.title}>Operations pulse</div>
        </div>
        <span style={styles.link}>View</span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>API</span>
        <span style={styles.value}>
          <StatusDot size={12} status={apiDot} />
          {apiStatus}
        </span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Database</span>
        <span style={styles.value}>
          <StatusDot size={12} status={dbDot} />
          {dbStatus}
        </span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Env</span>
        <span style={styles.valuePlain}>{appEnv}</span>
      </div>

      <div style={styles.footer}>
        Checked {lastChecked ? lastChecked.toLocaleTimeString() : 'pending'}
      </div>
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    backgroundColor: colors.surfaceMuted,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    color: colors.text.primary,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    padding: spacing.md,
    textAlign: 'left',
    width: '100%',
  },
  compactCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    color: colors.text.primary,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 72,
    padding: spacing.sm,
    width: '100%',
  },
  compactDots: {
    alignItems: 'center',
    display: 'flex',
    gap: 6,
  },
  compactLabel: {
    color: colors.text.secondary,
    fontFamily: font.mono,
    fontSize: font.size.xs,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  kicker: {
    color: colors.text.muted,
    fontFamily: font.mono,
    fontSize: font.size.xs,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text.primary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    marginTop: 4,
  },
  link: {
    color: colors.accent,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
  },
  value: {
    alignItems: 'center',
    color: colors.text.primary,
    display: 'flex',
    fontSize: font.size.sm,
    textTransform: 'capitalize',
  },
  valuePlain: {
    color: colors.text.primary,
    fontFamily: font.mono,
    fontSize: font.size.sm,
  },
  footer: {
    color: colors.text.muted,
    fontSize: font.size.xs,
    paddingTop: spacing.xs,
  },
};
