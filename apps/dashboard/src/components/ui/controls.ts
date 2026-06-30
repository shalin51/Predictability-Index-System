import type { CSSProperties } from 'react';
import { colors, font, radius, spacing } from '../../theme/tokens';

export const controlStyles = {
  input: {
    backgroundColor: colors.border,
    border: '1px solid transparent',
    borderRadius: radius.sm,
    color: colors.text.primary,
    fontSize: font.size.sm,
    padding: '10px 12px',
  } satisfies CSSProperties,
  primaryButton: {
    backgroundColor: colors.accent,
    border: 'none',
    borderRadius: radius.sm,
    color: '#fff',
    cursor: 'pointer',
    fontSize: font.size.sm,
    padding: '10px 16px',
  } satisfies CSSProperties,
  secondaryButton: {
    backgroundColor: colors.border,
    border: 'none',
    borderRadius: radius.sm,
    color: colors.text.primary,
    cursor: 'pointer',
    fontSize: font.size.sm,
    padding: '10px 16px',
  } satisfies CSSProperties,
  subtleButton: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.text.primary,
    cursor: 'pointer',
    fontSize: font.size.sm,
    padding: '8px 12px',
  } satisfies CSSProperties,
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.sm,
  } satisfies CSSProperties,
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  } satisfies CSSProperties,
  fieldLabel: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
  } satisfies CSSProperties,
  textarea: {
    backgroundColor: colors.border,
    border: '1px solid transparent',
    borderRadius: radius.sm,
    color: colors.text.primary,
    fontFamily: font.family,
    fontSize: font.size.sm,
    minHeight: 92,
    padding: '10px 12px',
    resize: 'vertical',
  } satisfies CSSProperties,
};

export function getTabButtonStyle(active: boolean): CSSProperties {
  return {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${active ? colors.accent : colors.border}`,
    borderRadius: radius.sm,
    color: active ? colors.text.primary : colors.text.secondary,
    cursor: 'pointer',
    fontSize: font.size.sm,
    padding: '8px 12px',
    textTransform: 'capitalize',
  };
}
