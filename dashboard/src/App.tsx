import { useState } from 'react';
import { DashboardViewContent } from './app/DashboardViewContent';
import { getActiveNavView, NAV, VIEW_META } from './app/dashboardConfig';
import {
  createDefaultNotifications,
  createDefaultViewNotification,
  createThemeNotification,
  prependUniqueNotification,
} from './app/dashboardNotifications';
import { AppShell, type ShellNotification } from './components/shell/AppShell';
import { useDashboardPreferences } from './hooks/useDashboardPreferences';
import { useDashboardRoute } from './hooks/useDashboardRoute';
import { useDashboardTheme } from './hooks/useDashboardTheme';
import { colors, themeOptions } from './theme/tokens';

export default function App() {
  const [preferences, setPreferences] = useDashboardPreferences();
  const [theme, setTheme] = useDashboardTheme();
  const {
    navigate,
    selectedFormulationId,
    setHasUnsavedChanges,
    view,
  } = useDashboardRoute(preferences.defaultView);
  const [notifications, setNotifications] = useState<ShellNotification[]>(() => createDefaultNotifications());

  const handleThemeChange = (nextTheme: typeof theme) => {
    setTheme(nextTheme);
    setNotifications((current) => prependUniqueNotification(current, createThemeNotification(nextTheme)));
  };

  const handlePreferenceChange = (next: typeof preferences) => {
    setPreferences(next);

    if (next.defaultView !== preferences.defaultView) {
      setNotifications((current) => (
        prependUniqueNotification(current, createDefaultViewNotification(next.defaultView))
      ));
    }
  };

  const activeView = getActiveNavView(view);
  return (
    <div
      style={{
        backgroundColor: colors.bg,
        height: '100vh',
        overflow: 'hidden',
        overflowX: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          background: `radial-gradient(circle, ${colors.accentSoft} 0%, transparent 72%)`,
          filter: 'blur(12px)',
          height: 280,
          left: -60,
          position: 'absolute',
          top: -40,
          width: 280,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          background: `radial-gradient(circle, ${colors.bgAlt} 0%, transparent 70%)`,
          bottom: -80,
          filter: 'blur(18px)',
          height: 320,
          position: 'absolute',
          right: -60,
          width: 320,
        }}
      />

      <AppShell
        activeView={activeView}
        navItems={NAV}
        notifications={notifications}
        onMarkAllNotificationsRead={() => {
          setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
        }}
        onNavigate={(nextView) => {
          const route = nextView === 'analysis'
            ? { formulationId: selectedFormulationId, view: nextView }
            : { formulationId: '', view: nextView };
          void navigate(route);
        }}
        onOpenSettings={() => {
          void navigate({ formulationId: '', view: 'settings' });
        }}
        onThemeChange={handleThemeChange}
        onToggleNotificationRead={(id) => {
          setNotifications((current) => current.map((notification) => (
            notification.id === id ? { ...notification, read: !notification.read } : notification
          )));
        }}
        overviewView="dashboard"
        subtitle={VIEW_META[view].subtitle}
        theme={theme}
        themeOptions={themeOptions}
        title={VIEW_META[view].title}
      >
        <DashboardViewContent
          navigate={navigate}
          onPreferenceChange={handlePreferenceChange}
          onThemeChange={handleThemeChange}
          preferences={preferences}
          selectedFormulationId={selectedFormulationId}
          setHasUnsavedChanges={setHasUnsavedChanges}
          theme={theme}
          view={view}
        />
      </AppShell>
    </div>
  );
}
