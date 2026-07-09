import type { CSSProperties } from 'react';

type InteractiveButtonStyle = CSSProperties & {
  '--button-bg'?: string;
  '--button-bg-hover'?: string;
  '--button-border'?: string;
  '--button-border-hover'?: string;
  '--button-fg'?: string;
  '--button-fg-hover'?: string;
};

interface InteractiveButtonOptions {
  backgroundColor: string;
  backgroundHoverColor?: string;
  borderColor: string;
  borderHoverColor?: string;
  color: string;
  colorHover?: string;
}

export function createInteractiveButtonStyle({
  backgroundColor,
  backgroundHoverColor = backgroundColor,
  borderColor,
  borderHoverColor = borderColor,
  color,
  colorHover = color,
}: InteractiveButtonOptions): InteractiveButtonStyle {
  return {
    '--button-bg': backgroundColor,
    '--button-bg-hover': backgroundHoverColor,
    '--button-border': borderColor,
    '--button-border-hover': borderHoverColor,
    '--button-fg': color,
    '--button-fg-hover': colorHover,
    background: 'var(--button-bg)',
    border: '1px solid var(--button-border)',
    color: 'var(--button-fg)',
  };
}
