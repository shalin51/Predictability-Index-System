import type { CSSProperties } from 'react';
import { colors, font, radius, spacing } from '../../theme/tokens';

export function labelize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === 'string' && value.includes('T')) return value.slice(0, 10);
  return String(value);
}

export function totalTone(total: number): CSSProperties {
  if (Math.abs(total - 100) < 0.0001) return { backgroundColor: colors.status.okBg, color: colors.status.ok };
  if (total > 100) return { backgroundColor: colors.status.errorBg, color: colors.status.error };
  return { backgroundColor: colors.status.warningBg, color: colors.status.warning };
}

export const formulationStyles: Record<string, CSSProperties> = {
  actions: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
  badge: { borderRadius: radius.sm, display: 'inline-flex', fontSize: font.size.small, fontWeight: font.weight.semibold, padding: '5px 8px' },
  filters: { display: 'grid', gap: spacing.space3, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', marginBottom: spacing.space4 },
  formGrid: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  header: { alignItems: 'flex-start', display: 'flex', gap: spacing.space4, justifyContent: 'space-between' },
  muted: { color: colors.text.muted, fontSize: font.size.small },
  panel: { border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.space4 },
  stack: { display: 'grid', gap: spacing.space4 },
  subtitle: { color: colors.text.secondary, margin: 0 },
  table: { borderCollapse: 'collapse', minWidth: 980, width: '100%' },
  tableWrap: { border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: 'auto' },
  td: { borderBottom: `1px solid ${colors.border}`, color: colors.text.secondary, fontSize: font.size.small, padding: spacing.space3, verticalAlign: 'top' },
  th: { backgroundColor: colors.surfaceElevated, borderBottom: `1px solid ${colors.border}`, color: colors.text.muted, fontSize: font.size.small, padding: spacing.space3, textAlign: 'left' },
  title: { color: colors.text.primary, fontSize: font.size.h1, margin: 0 },
};
