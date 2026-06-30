import type { CSSProperties, ReactNode } from 'react';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

interface CardProps {
  children: ReactNode;
  maxWidth?: CSSProperties['maxWidth'];
  style?: CSSProperties;
}

export function Card({ children, maxWidth = '100%', style }: CardProps) {
  const cardStyle: CSSProperties = {
    backgroundColor: colors.surface,
    backdropFilter: 'blur(22px)',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    padding: `${spacing.xl}px ${spacing.xl + 8}px`,
    width: '100%',
    maxWidth,
    boxShadow: shadow.card,
    ...style,
  };
  return <div style={cardStyle}>{children}</div>;
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
  };
  const labelStyle: CSSProperties = {
    color: colors.text.secondary,
    fontSize: 14,
  };
  const valueStyle: CSSProperties = {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: 500,
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

export function Divider() {
  return (
    <div
      style={{
        height: 1,
        backgroundColor: colors.border,
        margin: `${spacing.md}px 0`,
      }}
    />
  );
}
