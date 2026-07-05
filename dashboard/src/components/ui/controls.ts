import type { CSSProperties } from 'react';
import { colors, font, radius, spacing } from '../../theme/tokens';

export const controlStyles = {
  input: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.text.primary,
    fontSize: font.size.body,
    padding: '10px 14px',
    transition: 'all 0.12s ease',
  } satisfies CSSProperties,
  primaryButton: {
    backgroundColor: colors.brand.primary,
    border: `1px solid ${colors.brand.primary}`,
    borderRadius: radius.md,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: font.size.body,
    fontWeight: font.weight.semibold,
    padding: '10px 20px',
    transition: 'all 0.12s ease',
  } satisfies CSSProperties,
  secondaryButton: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    cursor: 'pointer',
    fontSize: font.size.body,
    fontWeight: font.weight.medium,
    padding: '10px 20px',
    transition: 'all 0.12s ease',
  } satisfies CSSProperties,
  subtleButton: {
    backgroundColor: colors.surfaceMuted,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    cursor: 'pointer',
    fontSize: font.size.body,
    padding: '10px 16px',
    transition: 'all 0.12s ease',
  } satisfies CSSProperties,
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.space4,
  } satisfies CSSProperties,
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.space2,
  } satisfies CSSProperties,
  fieldLabel: {
    color: colors.text.secondary,
    fontSize: font.size.small,
    fontWeight: font.weight.medium,
  } satisfies CSSProperties,
  textarea: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.text.primary,
    fontFamily: font.family,
    fontSize: font.size.body,
    minHeight: 120,
    padding: '12px 14px',
    resize: 'vertical',
    transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
  } satisfies CSSProperties,
};

export function getTabButtonStyle(active: boolean): CSSProperties {
  return {
    backgroundColor: active ? colors.surfaceElevated : 'transparent',
    border: `1px solid ${active ? colors.borderStrong : 'transparent'}`,
    borderRadius: radius.md,
    color: active ? colors.text.primary : colors.text.secondary,
    cursor: 'pointer',
    fontSize: font.size.small,
    fontWeight: active ? font.weight.semibold : font.weight.medium,
    padding: '10px 16px',
    textTransform: 'capitalize',
    transition: 'all 0.12s ease',
  };
}
