import type { CSSProperties } from 'react';
import { colors, font, radius, spacing } from '../../theme/tokens';
import type { LabMetricCategory } from '../../services/api';

export const LAB_TABS: Array<{ id: LabMetricCategory | 'observations' | 'review'; label: string }> = [
  { id: 'physical', label: 'Physical' },
  { id: 'performance', label: 'Performance' },
  { id: 'durability', label: 'Durability' },
  { id: 'environmental', label: 'Environmental' },
  { id: 'subjective', label: 'Subjective' },
  { id: 'observations', label: 'Observations' },
  { id: 'review', label: 'Review' },
];

export const METRIC_ORDER: Record<LabMetricCategory, string[]> = {
  durability: ['air_cannon_cycles_to_failure', 'crack_initiation_cycles', 'deformation_measurement'],
  environmental: ['hot_temperature_performance', 'cold_temperature_performance', 'humidity_exposure_result'],
  performance: ['bounce_height', 'hardness', 'compression', 'deflection', 'coefficient_of_restitution'],
  physical: ['weight', 'diameter', 'wall_thickness', 'roundness', 'balance_deviation'],
  subjective: ['feel_rating', 'sound_rating', 'perceived_speed', 'perceived_durability'],
};

export const labStyles: Record<string, CSSProperties> = {
  actions: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
  filters: { display: 'grid', gap: spacing.space3, gridTemplateColumns: '2fr repeat(6, minmax(120px, 1fr))', marginBottom: spacing.space4 },
  header: { alignItems: 'flex-start', display: 'flex', gap: spacing.space4, justifyContent: 'space-between' },
  input: { minWidth: 96, width: '100%' },
  muted: { color: colors.text.muted, fontSize: font.size.small },
  panel: { border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.space4 },
  progressTrack: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, height: 8, overflow: 'hidden', width: '100%' },
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
