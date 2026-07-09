import type { CSSProperties } from 'react';
import type { TrafficLight } from '../../../services/api';
import { getBadgeToneStyle, getTextToneColor, getTrafficTone } from '../../../theme/semantic';
import { colors, font, radius, spacing } from '../../../theme/tokens';

export function formatDashValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === 'string' && value.includes('T')) return value.slice(0, 10);
  return String(value);
}

export function formatDashScore(value: unknown) {
  return typeof value === 'number' ? String(Math.round(value)) : formatDashValue(value);
}

export function formatDashPercent(value: unknown) {
  return typeof value === 'number' ? `${Math.round(value)}%` : formatDashValue(value);
}

export function trafficColor(value?: TrafficLight | string | null) {
  return getTextToneColor(getTrafficTone(value));
}

export function trafficBg(value?: TrafficLight | string | null) {
  return getBadgeToneStyle(getTrafficTone(value)).backgroundColor;
}

export function TrafficBadge({ value }: { value?: TrafficLight | string | null }) {
  const label = value ? value[0].toUpperCase() + value.slice(1) : '-';
  return <span style={{ ...dashboardStyles.badge, ...getBadgeToneStyle(getTrafficTone(value)) }}>{label}</span>;
}

export const dashboardStyles: Record<string, CSSProperties> = {
  badge: { borderRadius: radius.sm, display: 'inline-flex', fontSize: font.size.small, fontWeight: font.weight.semibold, padding: '4px 8px' },
  barTrack: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, height: 8, overflow: 'hidden', width: '100%' },
  cardGrid: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  gridTwo: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  header: { alignItems: 'flex-start', display: 'flex', gap: spacing.space4, justifyContent: 'space-between' },
  muted: { color: colors.text.muted, fontSize: font.size.small },
  panel: { border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.space4 },
  sectionTitle: { color: colors.text.primary, fontSize: font.size.h3, margin: 0 },
  stack: { display: 'grid', gap: spacing.space4 },
  subtitle: { color: colors.text.secondary, margin: 0 },
  table: { borderCollapse: 'collapse', minWidth: 760, width: '100%' },
  tableWrap: { border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: 'auto' },
  td: { borderBottom: `1px solid ${colors.border}`, color: colors.text.secondary, fontSize: font.size.small, padding: spacing.space3, verticalAlign: 'top' },
  th: { backgroundColor: colors.surfaceElevated, borderBottom: `1px solid ${colors.border}`, color: colors.text.muted, fontSize: font.size.small, padding: spacing.space3, textAlign: 'left' },
  title: { color: colors.text.primary, fontSize: font.size.h1, margin: 0 },
};
