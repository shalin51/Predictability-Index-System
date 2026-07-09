import type { CSSProperties } from 'react';
import { createInteractiveButtonStyle } from '../../theme/buttonStyles';
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
    ...createInteractiveButtonStyle({
      backgroundColor: colors.brand.primary,
      backgroundHoverColor: colors.brand.primaryHover,
      borderColor: colors.brand.primary,
      borderHoverColor: colors.brand.primaryHover,
      color: colors.brand.foreground,
    }),
    borderRadius: radius.md,
    cursor: 'pointer',
    fontSize: font.size.body,
    fontWeight: font.weight.semibold,
    padding: '10px 20px',
    transition: 'all 0.12s ease',
  } satisfies CSSProperties,
  secondaryButton: {
    ...createInteractiveButtonStyle({
      backgroundColor: colors.surface,
      backgroundHoverColor: colors.surfaceMuted,
      borderColor: colors.border,
      borderHoverColor: colors.borderStrong,
      color: colors.text.primary,
    }),
    borderRadius: radius.md,
    cursor: 'pointer',
    fontSize: font.size.body,
    fontWeight: font.weight.medium,
    padding: '10px 20px',
    transition: 'all 0.12s ease',
  } satisfies CSSProperties,
  subtleButton: {
    ...createInteractiveButtonStyle({
      backgroundColor: colors.surfaceMuted,
      backgroundHoverColor: colors.accentSoft,
      borderColor: colors.border,
      borderHoverColor: colors.borderStrong,
      color: colors.text.primary,
    }),
    borderRadius: radius.md,
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
    ...createInteractiveButtonStyle({
      backgroundColor: active ? colors.surfaceElevated : 'transparent',
      backgroundHoverColor: colors.accentSoft,
      borderColor: active ? colors.borderStrong : 'transparent',
      borderHoverColor: active ? colors.borderStrong : colors.border,
      color: active ? colors.text.primary : colors.text.secondary,
      colorHover: colors.text.primary,
    }),
    borderRadius: radius.md,
    cursor: 'pointer',
    fontSize: font.size.small,
    fontWeight: active ? font.weight.semibold : font.weight.medium,
    padding: '10px 16px',
    textTransform: 'capitalize',
    transition: 'all 0.12s ease',
  };
}
