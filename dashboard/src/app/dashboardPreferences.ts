export interface DashboardPreferences {
  autoRefresh: boolean;
  defaultView: SettingsLandingView;
  denseTables: boolean;
  desktopAlerts: boolean;
}

export type SettingsLandingView = 'dashboard' | 'formulations' | 'benchmarks';

export const DEFAULT_PREFERENCES: DashboardPreferences = {
  autoRefresh: true,
  defaultView: 'dashboard',
  denseTables: false,
  desktopAlerts: true,
};

export const DASHBOARD_PREFERENCES_KEY = 'dashboard-preferences';

export function isSettingsLandingView(value: string | undefined): value is SettingsLandingView {
  return value === 'dashboard'
    || value === 'formulations'
    || value === 'benchmarks';
}

export function getStoredPreferences(): DashboardPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(DASHBOARD_PREFERENCES_KEY);
    if (!raw) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as {
      autoRefresh?: boolean;
      defaultView?: string;
      denseTables?: boolean;
      desktopAlerts?: boolean;
    };

    return {
      autoRefresh: parsed.autoRefresh ?? DEFAULT_PREFERENCES.autoRefresh,
      defaultView: parsed.defaultView === 'heartbeat'
        ? 'dashboard'
        : isSettingsLandingView(parsed.defaultView)
          ? parsed.defaultView
          : DEFAULT_PREFERENCES.defaultView,
      denseTables: parsed.denseTables ?? DEFAULT_PREFERENCES.denseTables,
      desktopAlerts: parsed.desktopAlerts ?? DEFAULT_PREFERENCES.desktopAlerts,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
