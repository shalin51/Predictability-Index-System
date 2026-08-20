import type { ReactNode } from 'react';
import { useState } from 'react';
import { ShellHeader } from './ShellHeader';
import { ShellSidebar } from './ShellSidebar';
import type { IconName } from './ShellIcon';
import { shellStyles } from './shellStyles';
import { useTransientScrollbars } from '../../hooks/useTransientScrollbars';
import type { ThemeName } from '../../theme/tokens';

export interface ShellNavItem<T extends string> {
  id: T;
  label: string;
  description: string;
  group: string;
  icon: IconName;
}

export interface ShellThemeOption {
  id: ThemeName;
  label: string;
  description: string;
}

interface AppShellProps<T extends string> {
  activeView: T;
  children: ReactNode;
  onLogout: () => void;
  onNavigate: (view: T) => void;
  onOpenSettings: () => void;
  onThemeChange: (theme: ThemeName) => void;
  subtitle: string;
  theme: ThemeName;
  themeOptions: ShellThemeOption[];
  title: string;
  userName: string;
  navItems: readonly ShellNavItem<T>[];
}

export function AppShell<T extends string>({
  activeView,
  children,
  onLogout,
  onNavigate,
  onOpenSettings,
  onThemeChange,
  subtitle,
  theme,
  themeOptions,
  title,
  userName,
  navItems,
}: AppShellProps<T>) {
  const [openMenu, setOpenMenu] = useState<'profile' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? true : !window.matchMedia('(max-width: 1080px)').matches
  ));
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
        sidebarOpen={sidebarOpen}
      />

      <div
        className="dashboard-shell__main"
        style={shellStyles.main}
      >
        <ShellHeader
          onLogout={onLogout}
          onOpenSettings={() => {
            onOpenSettings();
            closeSidebarOnSmallScreen();
          }}
          onThemeChange={onThemeChange}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          sidebarOpen={sidebarOpen}
          subtitle={subtitle}
          theme={theme}
          themeOptions={themeOptions}
          title={title}
          userName={userName}
          toggleSidebar={() => setSidebarOpen((current) => !current)}
        />

        <main className="dashboard-shell__content">
          <div className="dashboard-shell__page dashboard-shell__scroll">{children}</div>
        </main>
      </div>
    </div>
  );
}
