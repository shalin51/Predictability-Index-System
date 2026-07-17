import type { ReactNode } from 'react';
import { useState } from 'react';
import { ShellHeader } from './ShellHeader';
import { ShellSidebar } from './ShellSidebar';
import type { IconName } from './ShellIcon';
import { shellStyles } from './shellStyles';
import { useTransientScrollbars } from '../../hooks/useTransientScrollbars';
import type { ThemeName } from '../../theme/tokens';

type NotificationTone = 'info' | 'warning' | 'success';

export interface ShellNavItem<T extends string> {
  id: T;
  label: string;
  description: string;
  group: string;
  icon: IconName;
}

export interface ShellNotification {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  tone: NotificationTone;
  read: boolean;
}

export interface ShellThemeOption {
  id: ThemeName;
  label: string;
  description: string;
}

interface AppShellProps<T extends string> {
  activeView: T;
  children: ReactNode;
  notifications: ShellNotification[];
  onMarkAllNotificationsRead: () => void;
  onNavigate: (view: T) => void;
  onOpenSettings: () => void;
  onThemeChange: (theme: ThemeName) => void;
  onToggleNotificationRead: (id: string) => void;
  subtitle: string;
  theme: ThemeName;
  themeOptions: ShellThemeOption[];
  title: string;
  navItems: readonly ShellNavItem<T>[];
  overviewView: T;
}

export function AppShell<T extends string>({
  activeView,
  children,
  notifications,
  onMarkAllNotificationsRead,
  onNavigate,
  onOpenSettings,
  onThemeChange,
  onToggleNotificationRead,
  subtitle,
  theme,
  themeOptions,
  title,
  navItems,
  overviewView,
}: AppShellProps<T>) {
  const [openMenu, setOpenMenu] = useState<'notifications' | 'profile' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? true : !window.matchMedia('(max-width: 1080px)').matches
  ));
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useTransientScrollbars();

  const closeSidebarOnSmallScreen = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1080px)').matches) {
      setSidebarOpen(false);
    }
  };

  const handleNavigate = (view: T) => {
    onNavigate(view);
    closeSidebarOnSmallScreen();
  };

  return (
    <div className={`dashboard-shell ${sidebarOpen ? 'dashboard-shell--sidebar-open' : 'dashboard-shell--sidebar-closed'}`}>
      <button
        aria-hidden={!sidebarOpen}
        className="dashboard-shell__backdrop"
        onClick={() => setSidebarOpen(false)}
        tabIndex={sidebarOpen ? 0 : -1}
        type="button"
      />

      <ShellSidebar
        activeView={activeView}
        navItems={navItems}
        onNavigate={handleNavigate}
        overviewView={overviewView}
        sidebarOpen={sidebarOpen}
      />

      <div
        className="dashboard-shell__main"
        style={shellStyles.main}
      >
        <ShellHeader
          notifications={notifications}
          onMarkAllNotificationsRead={onMarkAllNotificationsRead}
          onOpenSettings={() => {
            onOpenSettings();
            closeSidebarOnSmallScreen();
          }}
          onThemeChange={onThemeChange}
          onToggleNotificationRead={onToggleNotificationRead}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          sidebarOpen={sidebarOpen}
          subtitle={subtitle}
          theme={theme}
          themeOptions={themeOptions}
          title={title}
          toggleSidebar={() => setSidebarOpen((current) => !current)}
          unreadCount={unreadCount}
        />

        <main className="dashboard-shell__content">
          <div className="dashboard-shell__page dashboard-shell__scroll">{children}</div>
        </main>
      </div>
    </div>
  );
}
