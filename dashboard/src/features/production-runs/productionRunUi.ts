import type { CSSProperties } from 'react';
import { colors, font, radius, spacing } from '../../theme/tokens';
import type { ProductionRunStatus } from '../../services/api';

export const statusLabels: Record<ProductionRunStatus, string> = {
  archived: 'Archived',
  completed: 'Completed',
  curing: 'Curing',
  molded: 'Molded',
  planned: 'Planned',
  ready_for_testing: 'Ready for Testing',
  scored: 'Scored',
  testing: 'Testing',
};

export function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === 'string' && value.includes('T')) return value.slice(0, 10);
  return String(value);
}

export function statusTone(status: ProductionRunStatus): CSSProperties {
  if (status === 'planned') return { backgroundColor: colors.status.infoBg, color: colors.status.info };
  if (status === 'archived') return { backgroundColor: colors.surfaceMuted, color: colors.text.muted };
  if (status === 'completed' || status === 'scored') return { backgroundColor: colors.status.okBg, color: colors.status.ok };
  return { backgroundColor: colors.status.warningBg, color: colors.status.warning };
}

export const runStyles: Record<string, CSSProperties> = {
  actions: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
  badge: { borderRadius: radius.sm, display: 'inline-flex', fontSize: font.size.small, fontWeight: font.weight.semibold, padding: '5px 8px' },
  filters: { display: 'grid', gap: spacing.space3, gridTemplateColumns: '2fr repeat(5, 1fr)', marginBottom: spacing.space4 },
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
