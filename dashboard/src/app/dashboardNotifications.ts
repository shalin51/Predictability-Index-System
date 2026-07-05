import type { ShellNotification } from '../components/shell/AppShell';
import { themeOptions, type ThemeName } from '../theme/tokens';
import type { SettingsLandingView } from './dashboardPreferences';

export function createDefaultNotifications(): ShellNotification[] {
  return [
    {
      id: 'alert-workspace',
      title: 'Workspace ready',
      detail: 'The current workspace is ready for the next data model.',
      timeLabel: '05m',
      tone: 'success',
      read: false,
    },
    {
      id: 'alert-shell',
      title: 'Dashboard shell upgraded',
      detail: 'The workspace has been trimmed for the next configuration.',
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
