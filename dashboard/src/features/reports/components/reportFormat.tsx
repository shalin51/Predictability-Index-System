import type { CSSProperties } from 'react';
import type { TrafficLight } from '../../../services/api';
import { colors, font, radius, spacing } from '../../../theme/tokens';

export function formatReportValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === 'string' && value.includes('T')) return value.slice(0, 10);
  return String(value);
}

export function formatScore(value: unknown) {
  return typeof value === 'number' ? String(Math.round(value)) : formatReportValue(value);
}

export function formatPercent(value: unknown) {
  return typeof value === 'number' ? `${Math.round(value)}%` : formatReportValue(value);
}

export function trafficLabel(value?: TrafficLight | string | null) {
  if (!value) return '-';
  return value[0].toUpperCase() + value.slice(1);
}

export function trafficColor(value?: TrafficLight | string | null) {
  if (value === 'green') return colors.status.ok;
  if (value === 'yellow') return colors.status.warning;
  if (value === 'red') return colors.status.error;
  return colors.text.muted;
}

export function trafficBg(value?: TrafficLight | string | null) {
  if (value === 'green') return colors.status.okBg;
  if (value === 'yellow') return colors.status.warningBg;
  if (value === 'red') return colors.status.errorBg;
  return colors.surfaceMuted;
}

export const reportStyles: Record<string, CSSProperties> = {
  badge: { borderRadius: radius.sm, display: 'inline-flex', fontSize: font.size.small, fontWeight: font.weight.semibold, padding: '4px 8px' },
  cardGrid: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  header: { alignItems: 'flex-start', display: 'flex', gap: spacing.space4, justifyContent: 'space-between' },
  muted: { color: colors.text.muted, fontSize: font.size.small },
  panel: { border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.space4 },
  sectionTitle: { color: colors.text.primary, fontSize: font.size.h3, margin: 0 },
  stack: { display: 'grid', gap: spacing.space4 },
  subtitle: { color: colors.text.secondary, margin: 0 },
  table: { borderCollapse: 'collapse', minWidth: 960, width: '100%' },
  tableWrap: { border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: 'auto' },
  td: { borderBottom: `1px solid ${colors.border}`, color: colors.text.secondary, fontSize: font.size.small, padding: spacing.space3, verticalAlign: 'top' },
  th: { backgroundColor: colors.surfaceElevated, borderBottom: `1px solid ${colors.border}`, color: colors.text.muted, fontSize: font.size.small, padding: spacing.space3, textAlign: 'left' },
  title: { color: colors.text.primary, fontSize: font.size.h1, margin: 0 },
};

export function TrafficBadge({ value }: { value?: TrafficLight | string | null }) {
  return <span style={{ ...reportStyles.badge, backgroundColor: trafficBg(value), color: trafficColor(value) }}>{trafficLabel(value)}</span>;
}
