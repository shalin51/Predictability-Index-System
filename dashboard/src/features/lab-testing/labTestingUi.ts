import type { CSSProperties } from 'react';
import { colors, font, radius, spacing } from '../../theme/tokens';
export const LAB_TEST_METRIC_KEYS = [
  'weight',
  'compression',
  'stretch',
  'full_stretch_max',
  'hardness',
  'wall_thickness',
  'diameter',
  'drop_test',
] as const;

export const labStyles: Record<string, CSSProperties> = {
  actions: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
  centeredHeader: { alignItems: 'start', display: 'grid', gridTemplateColumns: '20% 45% 35%', justifyContent: 'space-between' },
  filterControl: { boxSizing: 'border-box', minWidth: 0, width: '100%' },
  filters: { display: 'grid', gap: spacing.space3, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', marginBottom: spacing.space4, minWidth: 0, width: '100%' },
  header: { alignItems: 'flex-start', display: 'flex', gap: spacing.space4, justifyContent: 'space-between' },
  input: { minWidth: 96, width: '100%' },
  muted: { color: colors.text.muted, fontSize: font.size.small },
  panel: { border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.space4 },
  progressTrack: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, height: 8, overflow: 'hidden', width: '100%' },
  progressSummary: { alignSelf: 'center', display: 'grid', gap: spacing.space2, gridColumn: '2', width: '100%' },
  sampleProgressGrid: { display: 'grid', gap: spacing.space3, gridTemplateColumns: 'repeat(3, minmax(140px, 1fr))' },
  saved: { color: colors.status.ok, fontSize: font.size.xs, marginTop: spacing.space1 },
  stack: { display: 'grid', gap: spacing.space4 },
  subtitle: { color: colors.text.secondary, margin: 0 },
  table: { borderCollapse: 'collapse', minWidth: 980, width: '100%' },
  tableWrap: { border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: 'auto' },
  td: { borderBottom: `1px solid ${colors.border}`, color: colors.text.secondary, fontSize: font.size.small, padding: spacing.space3, verticalAlign: 'top' },
  th: { backgroundColor: colors.surfaceElevated, borderBottom: `1px solid ${colors.border}`, color: colors.text.muted, fontSize: font.size.small, padding: spacing.space3, textAlign: 'left', whiteSpace: 'nowrap' },
  title: { color: colors.text.primary, fontSize: font.size.h1, margin: 0 },
};

export function formatLabValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === 'string' && value.includes('T')) return value.slice(0, 10);
  return String(value);
}
