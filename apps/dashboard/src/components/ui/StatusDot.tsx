import type { CSSProperties } from 'react';
import { colors } from '../../theme/tokens';

export type DotStatus = 'ok' | 'error' | 'checking';

const COLOR_MAP: Record<DotStatus, string> = {
  ok: colors.status.ok,
  error: colors.status.error,
  checking: colors.status.checking,
};

const SYMBOL_MAP: Record<DotStatus, string> = {
  ok: '●',
  error: '●',
  checking: '◌',
};

interface StatusDotProps {
  status: DotStatus;
  size?: number;
}

export function StatusDot({ status, size = 16 }: StatusDotProps) {
  const style: CSSProperties = {
    color: COLOR_MAP[status],
    fontSize: size,
    lineHeight: 1,
    marginRight: 6,
    display: 'inline-block',
  };
  return <span style={style}>{SYMBOL_MAP[status]}</span>;
}
