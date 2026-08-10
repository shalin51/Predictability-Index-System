import { useEffect, useState } from 'react';
import { DashboardViewContent } from './app/DashboardViewContent';
import { getActiveNavView, NAV, VIEW_META } from './app/dashboardConfig';
import {
  createDashboardNotifications,
} from './app/dashboardNotifications';
import { AppShell, type ShellNotification } from './components/shell/AppShell';
import { GlobalActivityOverlay } from './components/ui/GlobalActivityOverlay';
import { useDashboardPreferences } from './hooks/useDashboardPreferences';
import { useDashboardRoute } from './hooks/useDashboardRoute';
import { useDashboardTheme } from './hooks/useDashboardTheme';
import { colors, themeOptions } from './theme/tokens';
import { getDashboardOverview } from './services/api';
import { LoginPage } from './features/auth/LoginPage';
import {
  AUTH_CHANGED_EVENT,
  clearAuthSession,
  getAuthSession,
  type AuthSession,
} from './features/auth/authSession';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());

  useEffect(() => {
    const refreshSession = () => setSession(getAuthSession());
    window.addEventListener(AUTH_CHANGED_EVENT, refreshSession);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, refreshSession);
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    const remaining = Math.max(0, Date.parse(session.expiresAt) - Date.now());
    const timeoutId = window.setTimeout(clearAuthSession, remaining);
    return () => window.clearTimeout(timeoutId);
  }, [session]);

  if (!session) {
    return <LoginPage onAuthenticated={setSession} />;
  }

  return <AuthenticatedApp onLogout={clearAuthSession} session={session} />;
}

interface AuthenticatedAppProps {
  onLogout: () => void;
  session: AuthSession;
}

function AuthenticatedApp({ onLogout, session }: AuthenticatedAppProps) {
  const [preferences, setPreferences] = useDashboardPreferences();
  const [theme, setTheme] = useDashboardTheme();
  const {
    formulationId,
    formulationMode,
    labRunId,
    labTestingMode,
    libraryRecordId,
    libraryRecordMode,
    librarySection,
    materialMode,
    navigate,
    productionRunId,
    productionRunMode,
    reportId,
    reportMode,
    reportRunId,
    setHasUnsavedChanges,
    view,
  } = useDashboardRoute(preferences.defaultView);
  const [notifications, setNotifications] = useState<ShellNotification[]>([]);

  useEffect(() => {
    let active = true;
    const loadNotifications = () => {
      void getDashboardOverview().then((data) => {
        if (!active) return;
        setNotifications((current) => createDashboardNotifications(data).map((notification) => ({
          ...notification,
          read: current.find((item) => item.id === notification.id)?.read ?? false,
        })));
      }).catch(() => undefined);
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 60_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const handleThemeChange = (nextTheme: typeof theme) => {
    setTheme(nextTheme);
  };

  const handleSettingsSave = async ({
    preferences: next,
    theme: nextTheme,
  }: {
    preferences: typeof preferences;
    theme: typeof theme;
  }) => {
    setTheme(nextTheme);
    setPreferences(next);
  };

  const activeView = getActiveNavView(view);
  return (
    <div
      style={{
        backgroundColor: colors.bg,
        height: '100vh',
        overflow: 'hidden',
        overflowX: 'hidden',
        width: '100%',
      }}
    >
      <AppShell
        activeView={activeView}
        navItems={NAV}
        notifications={notifications}
        onMarkAllNotificationsRead={() => {
          setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
        }}
        onLogout={onLogout}
        onNavigate={(nextView) => {
          void navigate({ view: nextView });
        }}
        onOpenSettings={() => {
          void navigate({ view: 'settings' });
        }}
        onThemeChange={handleThemeChange}
        onToggleNotificationRead={(id) => {
          setNotifications((current) => current.map((notification) => (
            notification.id === id ? { ...notification, read: !notification.read } : notification
          )));
        }}
        subtitle={VIEW_META[view].subtitle}
        theme={theme}
        themeOptions={themeOptions}
        title={VIEW_META[view].title}
        userName={session.userName}
        >
        <DashboardViewContent
          navigate={navigate}
          formulationId={formulationId}
          formulationMode={formulationMode}
          labRunId={labRunId}
          labTestingMode={labTestingMode}
          libraryRecordId={libraryRecordId}
          libraryRecordMode={libraryRecordMode}
          librarySection={librarySection}
          materialMode={materialMode}
          onSettingsSave={handleSettingsSave}
          preferences={preferences}
          productionRunId={productionRunId}
          productionRunMode={productionRunMode}
          reportId={reportId}
          reportMode={reportMode}
          reportRunId={reportRunId}
          setHasUnsavedChanges={setHasUnsavedChanges}
          theme={theme}
          view={view}
        />
      </AppShell>
      <GlobalActivityOverlay />
    </div>
  );
}
