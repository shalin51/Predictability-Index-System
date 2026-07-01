import type { CSSProperties, ReactNode } from 'react';
import { colors, font, radius, spacing } from '../../theme/tokens';

interface DashboardPageProps {
  children: ReactNode;
  maxWidth?: CSSProperties['maxWidth'];
}

interface MessageBannerProps {
  children: ReactNode;
  tone: 'danger' | 'warning' | 'success';
}

export function DashboardPage({ children, maxWidth = '100%' }: DashboardPageProps) {
  return (
    <div style={styles.page}>
      <div style={{ ...styles.inner, maxWidth }}>{children}</div>
    </div>
  );
}

export function SectionHeading({
  action,
  title,
}: {
  action?: ReactNode;
  title: string;
}) {
  return (
    <div style={styles.sectionHeading}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div style={styles.emptyState}>{children}</div>;
}

export function MessageBanner({ children, tone }: MessageBannerProps) {
  return (
    <div
      style={{
        ...styles.banner,
        ...(tone === 'danger'
          ? styles.bannerDanger
          : tone === 'success'
            ? styles.bannerSuccess
            : styles.bannerWarning),
      }}
    >
      {children}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    padding: `${spacing.sm}px 0`,
    width: '100%',
  },
  inner: {
    minHeight: 0,
    width: '100%',
  },
  sectionHeading: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    margin: 0,
  },
  emptyState: {
    color: colors.text.muted,
    fontSize: font.size.sm,
    lineHeight: 1.6,
    padding: `${spacing.md}px 0`,
  },
  banner: {
    borderRadius: radius.md,
    fontSize: font.size.sm,
    padding: `${spacing.md}px ${spacing.lg}px`,
  },
  bannerDanger: {
    backgroundColor: 'rgba(127, 29, 29, 0.78)',
    border: '1px solid rgba(252, 165, 165, 0.28)',
    color: '#fecaca',
  },
  bannerWarning: {
    backgroundColor: '#422006',
    border: '1px solid #854d0e',
    color: '#fde68a',
  },
  bannerSuccess: {
    backgroundColor: 'rgba(20, 83, 45, 0.78)',
    border: '1px solid rgba(134, 239, 172, 0.28)',
    color: '#bbf7d0',
  },
};
