const cssVar = (name: string) => `var(${name})`;

const THEME_PRESETS = {
  dark: {
    '--color-bg': '#0B1220',
    '--color-bg-sidebar': '#0F172A',
    '--color-surface': '#111827',
    '--color-surface-elevated': '#1E293B',
    '--color-surface-muted': '#162033',
    '--color-border': '#263449',
    '--color-border-strong': '#334155',
    '--color-text-primary': '#F8FAFC',
    '--color-text-secondary': '#CBD5E1',
    '--color-text-muted': '#94A3B8',
    '--color-brand-primary': '#60A5FA',
    '--color-brand-secondary': '#7C3AED',
    '--color-brand-foreground': '#FFFFFF',
    '--color-brand-primary-hover': '#93C5FD',
    '--color-accent-soft': '#0B2A4A',
    '--color-focus-ring': '#38BDF8',
    '--color-focus-ring-soft': 'rgba(56, 189, 248, 0.18)',
    '--color-info': '#4ADE80',
    '--color-info-bg': '#052E16',
    '--color-status-info': '#0F6CBD',
    '--color-status-info-bg': '#EAF3FF',
    '--color-warning': '#FACC15',
    '--color-warning-bg': '#422006',
    '--color-danger': '#F87171',
    '--color-danger-bg': '#450A0A',
    '--color-shadow': 'rgba(0, 0, 0, 0.4)',
  },
  light: {
    '--color-bg': '#F7F9FC',
    '--color-bg-sidebar': '#FFFFFF',
    '--color-surface': '#FFFFFF',
    '--color-surface-elevated': '#FFFFFF',
    '--color-surface-muted': '#F1F5F9',
    '--color-border': '#E2E8F0',
    '--color-border-strong': '#CBD5E1',
    '--color-text-primary': '#0F172A',
    '--color-text-secondary': '#475569',
    '--color-text-muted': '#64748B',
    '--color-brand-primary': '#0F6CBD',
    '--color-brand-secondary': '#7C3AED',
    '--color-brand-foreground': '#FFFFFF',
    '--color-brand-primary-hover': '#115EA3',
    '--color-accent-soft': '#EAF3FF',
    '--color-focus-ring': '#2899F5',
    '--color-focus-ring-soft': 'rgba(15, 108, 189, 0.16)',
    '--color-info': '#107C10',
    '--color-info-bg': '#E7F6E7',
    '--color-status-info': '#0F6CBD',
    '--color-status-info-bg': '#EAF3FF',
    '--color-warning': '#B7791F',
    '--color-warning-bg': '#FFF4CE',
    '--color-danger': '#D13438',
    '--color-danger-bg': '#FDE7E9',
    '--color-shadow': 'rgba(15, 23, 42, 0.08)',
  },
  obsidian: {
    '--color-bg': '#10141A',
    '--color-bg-sidebar': '#10141A',
    '--color-surface': '#353940',
    '--color-surface-elevated': '#353940',
    '--color-surface-muted': '#1C2129',
    '--color-border': '#353940',
    '--color-border-strong': '#44475A',
    '--color-text-primary': '#FFFFFF',
    '--color-text-secondary': '#D8DFE8',
    '--color-text-muted': '#9EA9B8',
    '--color-brand-primary': '#00F0FF',
    '--color-brand-secondary': '#00E5FF',
    '--color-brand-foreground': '#03161A',
    '--color-brand-primary-hover': '#66F7FF',
    '--color-accent-soft': 'rgba(0, 229, 255, 0.18)',
    '--color-focus-ring': '#00F0FF',
    '--color-focus-ring-soft': 'rgba(0, 240, 255, 0.22)',
    '--color-info': '#00FFA3',
    '--color-info-bg': 'rgba(0, 255, 163, 0.18)',
    '--color-status-info': '#00E5FF',
    '--color-status-info-bg': 'rgba(0, 229, 255, 0.18)',
    '--color-warning': '#FFB86C',
    '--color-warning-bg': 'rgba(255, 184, 108, 0.18)',
    '--color-danger': '#FF5555',
    '--color-danger-bg': 'rgba(255, 85, 85, 0.18)',
    '--color-shadow': 'rgba(0, 0, 0, 0.55)',
  },
} as const;

export type ThemeName = keyof typeof THEME_PRESETS;

export const themeOptions: Array<{ id: ThemeName; label: string; description: string }> = [
  {
    id: 'light',
    label: 'Scientific Light',
    description: 'Fluent-inspired clean laboratory theme.',
  },
  {
    id: 'dark',
    label: 'Lab Console',
    description: 'Dark navy monitor-grade monitoring theme.',
  },
  {
    id: 'obsidian',
    label: 'Obsidian Laboratory',
    description: 'High-contrast dark laboratory interface with neon cyan actions.',
  },
];

export function isThemeName(value: string | null | undefined): value is ThemeName {
  return value != null && value in THEME_PRESETS;
}

export function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem('dashboard-theme');
  
  // Migration for legacy theme names
  if (stored === 'nightshift' || stored === 'graphite') {
    return 'dark';
  }
  if (stored === 'daybreak') {
    return 'light';
  }

  if (isThemeName(stored)) {
    return stored;
  }

  return 'light';
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
  root.style.colorScheme = themeName === 'light' ? 'light' : 'dark';
}

export const colors = {
  bg: cssVar('--color-bg'),
  bgSidebar: cssVar('--color-bg-sidebar'),
  surface: cssVar('--color-surface'),
  surfaceElevated: cssVar('--color-surface-elevated'),
  surfaceMuted: cssVar('--color-surface-muted'),
  border: cssVar('--color-border'),
  borderStrong: cssVar('--color-border-strong'),
  brand: {
    primary: cssVar('--color-brand-primary'),
    primaryHover: cssVar('--color-brand-primary-hover'),
    secondary: cssVar('--color-brand-secondary'),
    foreground: cssVar('--color-brand-foreground'),
  },
  text: {
    primary: cssVar('--color-text-primary'),
    secondary: cssVar('--color-text-secondary'),
    muted: cssVar('--color-text-muted'),
  },
  status: {
    ok: cssVar('--color-info'),
    okBg: cssVar('--color-info-bg'),
    checking: cssVar('--color-warning'),
    error: cssVar('--color-danger'),
    errorBg: cssVar('--color-danger-bg'),
    warning: cssVar('--color-warning'),
    warningBg: cssVar('--color-warning-bg'),
    info: cssVar('--color-status-info'),
    infoBg: cssVar('--color-status-info-bg'),
    ai: '#6B46C1',
    aiBg: '#F3E8FF',
  },
  focusRing: cssVar('--color-focus-ring'),
  focusRingSoft: cssVar('--color-focus-ring-soft'),
  accent: cssVar('--color-accent-soft'),
  accentSoft: cssVar('--color-accent-soft'),
  shadow: cssVar('--color-shadow'),
} as const;

export const spacing = {
  space0: 0,
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  space8: 32,
  space10: 40,
  space12: 48,
  // Helper mappings for backward compatibility if needed, but we should use space-X
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 64,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(15, 23, 42, 0.08)',
  md: '0 8px 24px rgba(15, 23, 42, 0.10)',
  card: cssVar('--color-shadow'), // Using our token
} as const;

export const font = {
  family: '"Segoe UI", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  size: {
    display: 28,
    h1: 24,
    h2: 20,
    h3: 16,
    body: 14,
    small: 13,
    table: 13,
    mono: 13,
    // Compat
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 36,
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;
