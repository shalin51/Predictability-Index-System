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
    minHeight: '100%',
    padding: `${spacing.space8}px 0`,
    width: '100%',
  },
  inner: {
    minHeight: '100%',
    width: '100%',
  },
  sectionHeading: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing.space4,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: font.size.h2,
    fontWeight: font.weight.bold,
    margin: 0,
  },
  emptyState: {
    color: colors.text.muted,
    fontSize: font.size.body,
    lineHeight: 1.6,
    padding: `${spacing.space4}px 0`,
  },
  banner: {
    borderRadius: radius.md,
    fontSize: font.size.body,
    padding: `${spacing.space4}px ${spacing.space6}px`,
  },
  bannerDanger: {
    backgroundColor: colors.status.errorBg,
    border: `1px solid ${colors.status.error}`,
    color: colors.status.error,
  },
  bannerWarning: {
    backgroundColor: colors.status.warningBg,
    border: `1px solid ${colors.status.warning}`,
    color: colors.status.warning,
  },
  bannerSuccess: {
    backgroundColor: colors.status.okBg,
    border: `1px solid ${colors.status.ok}`,
    color: colors.status.ok,
  },
};
