import type { CSSProperties, ReactNode } from 'react';
import { colors, font, radius, shadow, spacing } from '../../theme/tokens';

interface CardProps {
  children: ReactNode;
  maxWidth?: CSSProperties['maxWidth'];
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
