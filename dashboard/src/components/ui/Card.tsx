import type { CSSProperties, ReactNode } from 'react';
import { colors, font, radius, shadow, spacing } from '../../theme/tokens';

interface CardProps {
  children: ReactNode;
  maxWidth?: CSSProperties['maxWidth'];
  style?: CSSProperties;
}

interface PanelProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function Card({ children, maxWidth = '100%', style }: CardProps) {
  const cardStyle: CSSProperties = {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    padding: spacing.space6,
    width: '100%',
    maxWidth,
    boxShadow: shadow.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.space4,
    ...style,
  };
  return <div style={cardStyle}>{children}</div>;
}

export function CardHeader({ children }: { children: ReactNode }) {
  return (
    <div style={styles.cardHeader}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h1 style={styles.cardTitle}>{children}</h1>;
}

export function CardSubtitle({ children }: { children: ReactNode }) {
  return <p style={styles.cardSubtitle}>{children}</p>;
}

interface CardRowProps {
  label: string;
  children: ReactNode;
}

export function CardRow({ label, children }: CardRowProps) {
  const rowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.space1}px 0`,
  };
  const labelStyle: CSSProperties = {
    color: colors.text.secondary,
    fontSize: font.size.small,
  };
  const valueStyle: CSSProperties = {
    color: colors.text.primary,
    fontSize: font.size.small,
    fontWeight: font.weight.medium,
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{children}</span>
    </div>
  );
}

export function Panel({ children, style }: PanelProps) {
  return <div style={{ ...styles.panel, ...style }}>{children}</div>;
}

export function Divider() {
  return (
    <div
      style={{
        height: 1,
        backgroundColor: colors.border,
        margin: `${spacing.space4}px 0`,
      }}
    />
  );
}

const styles: Record<string, CSSProperties> = {
  cardHeader: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: spacing.space4,
    justifyContent: 'space-between',
  },
  cardSubtitle: {
    color: colors.text.secondary,
    margin: 0,
  },
  cardTitle: {
    color: colors.text.primary,
    fontSize: font.size.h1,
    margin: 0,
  },
  panel: {
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: spacing.space4,
  },
};
