const cssVar = (name: string) => `var(${name})`;

const THEME_PRESETS = {
  nightshift: {
    '--color-bg': '#08111f',
    '--color-bg-alt': '#101b31',
    '--color-surface': 'rgba(10, 18, 35, 0.84)',
    '--color-surface-elevated': 'rgba(20, 31, 56, 0.92)',
    '--color-surface-muted': 'rgba(13, 21, 38, 0.74)',
    '--color-border': 'rgba(96, 125, 180, 0.26)',
    '--color-border-strong': 'rgba(132, 164, 224, 0.44)',
    '--color-text-primary': '#f6f2e8',
    '--color-text-secondary': '#b3bfd8',
    '--color-text-muted': '#7483a4',
    '--color-accent': '#f97316',
    '--color-accent-soft': 'rgba(249, 115, 22, 0.14)',
    '--color-accent-contrast': '#fff7ed',
    '--color-info': '#22c55e',
    '--color-warning': '#f59e0b',
    '--color-danger': '#ef4444',
    '--color-shadow': 'rgba(2, 6, 23, 0.58)',
  },
  daybreak: {
    '--color-bg': '#f3ede3',
    '--color-bg-alt': '#e4dacb',
    '--color-surface': 'rgba(255, 250, 243, 0.9)',
    '--color-surface-elevated': 'rgba(248, 241, 230, 0.96)',
    '--color-surface-muted': 'rgba(238, 229, 214, 0.82)',
    '--color-border': 'rgba(120, 88, 42, 0.18)',
    '--color-border-strong': 'rgba(120, 88, 42, 0.3)',
    '--color-text-primary': '#1d2433',
    '--color-text-secondary': '#5b6474',
    '--color-text-muted': '#8a8176',
    '--color-accent': '#c2410c',
    '--color-accent-soft': 'rgba(194, 65, 12, 0.12)',
    '--color-accent-contrast': '#fff7ed',
    '--color-info': '#15803d',
    '--color-warning': '#b45309',
    '--color-danger': '#b91c1c',
    '--color-shadow': 'rgba(120, 88, 42, 0.16)',
  },
  graphite: {
    '--color-bg': '#111111',
    '--color-bg-alt': '#202020',
    '--color-surface': 'rgba(24, 24, 24, 0.9)',
    '--color-surface-elevated': 'rgba(35, 35, 35, 0.96)',
    '--color-surface-muted': 'rgba(28, 28, 28, 0.84)',
    '--color-border': 'rgba(255, 255, 255, 0.12)',
    '--color-border-strong': 'rgba(255, 255, 255, 0.2)',
    '--color-text-primary': '#f7f7f5',
    '--color-text-secondary': '#c3c3bb',
    '--color-text-muted': '#8d8d87',
    '--color-accent': '#14b8a6',
    '--color-accent-soft': 'rgba(20, 184, 166, 0.14)',
    '--color-accent-contrast': '#ecfeff',
    '--color-info': '#22c55e',
    '--color-warning': '#facc15',
    '--color-danger': '#fb7185',
    '--color-shadow': 'rgba(0, 0, 0, 0.4)',
  },
} as const;

export type ThemeName = keyof typeof THEME_PRESETS;

export const themeOptions: Array<{ id: ThemeName; label: string; description: string }> = [
  {
    id: 'nightshift',
    label: 'Nightshift',
    description: 'Dark control-room contrast with orange action highlights.',
  },
  {
    id: 'daybreak',
    label: 'Daybreak',
    description: 'Warm light mode for review-heavy sessions.',
  },
  {
    id: 'graphite',
    label: 'Graphite',
    description: 'Neutral dark mode with teal signal accents.',
  },
];

export function isThemeName(value: string | null | undefined): value is ThemeName {
  return value != null && value in THEME_PRESETS;
}

export function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') {
    return 'nightshift';
  }

  const stored = window.localStorage.getItem('dashboard-theme');
  if (isThemeName(stored)) {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'daybreak' : 'nightshift';
}

export function applyTheme(themeName: ThemeName) {
  if (typeof document === 'undefined') {
    return;
  }

  const theme = THEME_PRESETS[themeName];
  const root = document.documentElement;

  Object.entries(theme).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });

  root.dataset.theme = themeName;
  root.style.colorScheme = themeName === 'daybreak' ? 'light' : 'dark';
}

export const colors = {
  bg: cssVar('--color-bg'),
  bgAlt: cssVar('--color-bg-alt'),
  surface: cssVar('--color-surface'),
  surfaceElevated: cssVar('--color-surface-elevated'),
  surfaceMuted: cssVar('--color-surface-muted'),
  border: cssVar('--color-border'),
  borderStrong: cssVar('--color-border-strong'),
  accent: cssVar('--color-accent'),
  accentSoft: cssVar('--color-accent-soft'),
  accentContrast: cssVar('--color-accent-contrast'),
  shadow: cssVar('--color-shadow'),
  text: {
    primary: cssVar('--color-text-primary'),
    secondary: cssVar('--color-text-secondary'),
    muted: cssVar('--color-text-muted'),
  },
  status: {
    ok: cssVar('--color-info'),
    error: cssVar('--color-danger'),
    warning: cssVar('--color-warning'),
    checking: cssVar('--color-warning'),
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
} as const;

export const shadow = {
  card: `0 26px 80px ${colors.shadow}`,
  soft: `0 16px 42px ${colors.shadow}`,
} as const;

export const font = {
  family: '"Space Grotesk", "Segoe UI", sans-serif',
  mono: '"IBM Plex Mono", "Consolas", monospace',
  size: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 18,
    xl: 28,
    xxl: 40,
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;
