import { ShellIcon } from './ShellIcon';
import { ShellNotificationsMenu } from './ShellNotificationsMenu';
import { ShellProfileMenu } from './ShellProfileMenu';
import { shellStyles } from './shellStyles';
import type {
  ShellNotification,
  ShellThemeOption,
} from './AppShell';
import type { ThemeName } from '../../theme/tokens';

interface ShellHeaderProps {
  notifications: ShellNotification[];
  onMarkAllNotificationsRead: () => void;
  onOpenSettings: () => void;
  onThemeChange: (theme: ThemeName) => void;
  onToggleNotificationRead: (id: string) => void;
  openMenu: 'notifications' | 'profile' | null;
  setOpenMenu: (menu: 'notifications' | 'profile' | null) => void;
  sidebarOpen: boolean;
  subtitle: string;
  theme: ThemeName;
  themeOptions: ShellThemeOption[];
  title: string;
  toggleSidebar: () => void;
  unreadCount: number;
}

export function ShellHeader({
  notifications,
  onMarkAllNotificationsRead,
  onOpenSettings,
  onThemeChange,
  onToggleNotificationRead,
  openMenu,
  setOpenMenu,
  sidebarOpen,
  subtitle,
  theme,
  themeOptions,
  title,
  toggleSidebar,
  unreadCount,
}: ShellHeaderProps) {
  return (
    <header className="dashboard-shell__header" style={shellStyles.header}>
      <div className="dashboard-shell__header-intro" style={shellStyles.headerIntro}>
        <div style={shellStyles.headerKicker}>Control Center</div>
        <div style={shellStyles.headerTitle}>{title}</div>
        <div style={shellStyles.headerSubtitle}>{subtitle}</div>
      </div>

      <div className="dashboard-shell__header-actions" style={shellStyles.headerActions}>
        <button
          aria-label={sidebarOpen ? 'Close left menu' : 'Open left menu'}
          onClick={toggleSidebar}
          style={shellStyles.iconButton}
          type="button"
        >
          <ShellIcon name={sidebarOpen ? 'close' : 'menu'} />
        </button>

        <button
          onClick={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')}
          style={shellStyles.iconButton}
          type="button"
        >
          <ShellIcon name="bell" />
          {unreadCount > 0 && <span style={shellStyles.badge}>{unreadCount}</span>}
        </button>

        <button
          onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}
          style={shellStyles.profileButton}
          type="button"
        >
          <div style={shellStyles.profileAvatar}>PI</div>
          <div style={shellStyles.profileMeta}>
            <span style={shellStyles.profileName}>Plant Ops</span>
            <span style={shellStyles.profileRole}>System owner</span>
          </div>
          <ShellIcon name="user" />
        </button>
      </div>

      {openMenu === 'notifications' && (
        <ShellNotificationsMenu
          notifications={notifications}
          onMarkAllNotificationsRead={onMarkAllNotificationsRead}
          onToggleNotificationRead={onToggleNotificationRead}
          unreadCount={unreadCount}
        />
      )}

      {openMenu === 'profile' && (
        <ShellProfileMenu
          onMarkAllNotificationsRead={onMarkAllNotificationsRead}
          onOpenSettings={onOpenSettings}
          onThemeChange={onThemeChange}
          theme={theme}
          themeOptions={themeOptions}
        />
      )}
    </header>
  );
}
