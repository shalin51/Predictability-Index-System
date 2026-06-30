import type { ShellNotification } from '../components/shell/AppShell';
import { themeOptions, type ThemeName } from '../theme/tokens';
import type { SettingsLandingView } from './dashboardPreferences';

export function createDefaultNotifications(): ShellNotification[] {
  return [
    {
      id: 'alert-benchmark',
      title: 'Benchmark weights validated',
      detail: 'All benchmark profiles passed weight-balance checks in the latest review cycle.',
      timeLabel: '05m',
      tone: 'success',
      read: false,
    },
    {
      id: 'alert-results',
      title: 'Test result capture pending',
      detail: 'At least one formulation is waiting on 72-hour test inputs before analysis can complete.',
      timeLabel: '18m',
      tone: 'warning',
      read: false,
    },
    {
      id: 'alert-shell',
      title: 'Dashboard shell upgraded',
      detail: 'Sidebar navigation, profile controls, settings, and theme presets are now available locally.',
      timeLabel: 'Now',
      tone: 'info',
      read: false,
    },
  ];
}

export function createThemeNotification(theme: ThemeName): ShellNotification {
  return {
    id: `theme-${theme}`,
    title: `Theme switched to ${themeOptions.find((option) => option.id === theme)?.label ?? theme}`,
    detail: 'Appearance was updated for the current workspace session.',
    timeLabel: 'Now',
    tone: 'info',
    read: false,
  };
}

export function createDefaultViewNotification(view: SettingsLandingView): ShellNotification {
  return {
    id: `default-view-${view}`,
    title: 'Default landing view updated',
    detail: `Future dashboard sessions will open on ${view}.`,
    timeLabel: 'Now',
    tone: 'info',
    read: false,
  };
}

export function prependUniqueNotification(
  notifications: ShellNotification[],
  notification: ShellNotification,
): ShellNotification[] {
  return [
    notification,
    ...notifications.filter((item) => item.id !== notification.id),
  ];
}
