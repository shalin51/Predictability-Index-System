import type { CSSProperties } from 'react';
import type { ProductionRunStatus, TrafficLight } from '../services/api';
import { colors } from './tokens';

export type SemanticTone = 'brand' | 'danger' | 'info' | 'neutral' | 'success' | 'warning';

interface SemanticPalette {
  background: string;
  border: string;
  fill: string;
  foreground: string;
}

function getSemanticPalette(tone: SemanticTone): SemanticPalette {
  if (tone === 'success') {
    return {
      background: colors.status.okBg,
      border: colors.status.ok,
      fill: colors.status.ok,
      foreground: colors.status.ok,
    };
  }

  if (tone === 'warning') {
    return {
      background: colors.status.warningBg,
      border: colors.status.warning,
      fill: colors.status.warning,
      foreground: colors.status.warning,
    };
  }

  if (tone === 'danger') {
    return {
      background: colors.status.errorBg,
      border: colors.status.error,
      fill: colors.status.error,
      foreground: colors.status.error,
    };
  }

  if (tone === 'info') {
    return {
      background: colors.status.infoBg,
      border: colors.status.info,
      fill: colors.status.info,
      foreground: colors.status.info,
    };
  }

  if (tone === 'brand') {
    return {
      background: colors.accentSoft,
      border: colors.brand.primary,
      fill: colors.brand.primary,
      foreground: colors.brand.primary,
    };
  }

  return {
    background: colors.surfaceMuted,
    border: colors.borderStrong,
    fill: colors.text.muted,
    foreground: colors.text.secondary,
  };
}

export function getBadgeToneStyle(tone: SemanticTone): CSSProperties {
  const palette = getSemanticPalette(tone);

  return {
    backgroundColor: palette.background,
    border: `1px solid ${palette.border}`,
    color: palette.foreground,
  };
}

export function getChartFillColor(tone: SemanticTone = 'brand') {
  return getSemanticPalette(tone).fill;
}

export function getProgressFillColor(tone: SemanticTone = 'brand') {
  return getSemanticPalette(tone).fill;
}

export function getTextToneColor(tone: SemanticTone) {
  return getSemanticPalette(tone).foreground;
}

export function getTrafficTone(value?: TrafficLight | string | null): SemanticTone {
  if (value === 'green') return 'success';
  if (value === 'yellow') return 'warning';
  if (value === 'red') return 'danger';
  return 'neutral';
}

export function getProductionRunTone(status: ProductionRunStatus): SemanticTone {
  if (status === 'planned') return 'info';
  if (status === 'archived') return 'neutral';
  if (status === 'completed' || status === 'scored') return 'success';
  return 'warning';
}

export function getCompositionTone(total: number): SemanticTone {
  if (Math.abs(total - 100) < 0.0001) return 'success';
  if (total > 100) return 'danger';
  return 'warning';
}
