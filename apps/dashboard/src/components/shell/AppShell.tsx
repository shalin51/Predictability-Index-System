import type { ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ShellHeader } from './ShellHeader';
import { ShellSidebar } from './ShellSidebar';
import type { IconName } from './ShellIcon';
import { shellStyles } from './shellStyles';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarScrolling, setSidebarScrolling] = useState(false);
  const [mainScrolling, setMainScrolling] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const closeSidebarOnSmallScreen = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1080px)').matches) {
      setSidebarOpen(false);
    }
  };

  const handleNavigate = (view: T) => {
    onNavigate(view);
    closeSidebarOnSmallScreen();
  };

  useTransientScrollState(sidebarRef, setSidebarScrolling);
  useTransientScrollState(mainRef, setMainScrolling);

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
        scrolling={sidebarScrolling}
        sidebarOpen={sidebarOpen}
        sidebarRef={sidebarRef}
      />

      <div
        className={`dashboard-shell__main ${mainScrolling ? 'dashboard-shell__scrolling' : ''}`}
        ref={mainRef}
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

function useTransientScrollState<T extends HTMLElement>(
  ref: RefObject<T>,
  setScrolling: (scrolling: boolean) => void,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    let timeoutId: number | null = null;

    const handleScroll = () => {
      setScrolling(true);

      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        setScrolling(false);
        timeoutId = null;
      }, 700);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);

      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [ref, setScrolling]);
}
