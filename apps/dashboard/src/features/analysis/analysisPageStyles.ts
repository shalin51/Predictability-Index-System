import type { CSSProperties } from 'react';
import { controlStyles } from '../../components/ui/controls';
import { colors, font, radius, spacing } from '../../theme/tokens';

export const analysisPageStyles: Record<string, CSSProperties> = {
  comparisonHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  comparisonHeaderRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  comparisonTitle: {
    color: colors.text.primary,
    fontWeight: font.weight.semibold,
  },
  homeScoreWrap: {
    marginTop: spacing.md,
  },
  metricCategory: {
    marginBottom: spacing.md,
  },
  metricCategoryTitle: {
    color: colors.text.secondary,
    fontSize: font.size.xs,
    letterSpacing: '0.08em',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  metricTableWrap: {
    overflowX: 'auto',
  },
  muted: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
  productionReady: {
    color: colors.status.ok,
    fontSize: font.size.xs,
  },
  riskCard: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: `${spacing.md}px`,
  },
  riskMeta: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
  },
  riskRows: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  riskTitle: {
    color: colors.text.primary,
    fontWeight: font.weight.semibold,
  },
  scoreCard: {
    backgroundColor: colors.surfaceElevated,
    border: `2px solid ${colors.border}`,
    borderRadius: radius.md,
    minWidth: 180,
    padding: `${spacing.md}px`,
  },
  scoreCardInner: {
    minWidth: 0,
  },
  scoreCardScale: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
  },
  scoreCardTitle: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    marginBottom: 4,
  },
  scoreCardValue: {
    fontSize: 32,
    fontWeight: font.weight.bold,
  },
  scoreCardValueRow: {
    alignItems: 'center',
    display: 'flex',
    gap: 12,
  },
  scoreList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  scoreRiskItem: {
    color: '#fca5a5',
    fontSize: font.size.xs,
  },
  scoreRiskList: {
    margin: '8px 0 0 0',
    paddingLeft: 16,
  },
  select: {
    ...controlStyles.input,
    flex: 1,
    minWidth: 200,
  },
  selectorControls: {
    display: 'flex',
    flex: 1,
    gap: spacing.sm,
  },
  selectorLabel: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
  },
  selectorRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: `${spacing.md}px`,
  },
  summaryGrid: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  },
  summaryLabel: {
    color: colors.text.muted,
    fontSize: font.size.xs,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text.primary,
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    marginTop: 4,
  },
  table: {
    borderCollapse: 'collapse',
    fontSize: font.size.sm,
    width: '100%',
  },
  tableHeadRow: {
    color: colors.text.muted,
    textAlign: 'left',
  },
  tableRow: {
    borderBottom: `1px solid ${colors.border}`,
  },
  tabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  td: {
    color: colors.text.primary,
    padding: '6px 8px',
    verticalAlign: 'middle',
  },
  th: {
    borderBottom: `1px solid ${colors.border}`,
    color: colors.text.muted,
    fontSize: font.size.xs,
    fontWeight: font.weight.medium,
    padding: '4px 8px',
  },
  title: {
    color: colors.text.primary,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    margin: `0 0 ${spacing.xs}px`,
  },
  trafficBadge: {
    borderRadius: 4,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    letterSpacing: '0.04em',
    padding: '2px 8px',
    textTransform: 'uppercase',
  },
};
