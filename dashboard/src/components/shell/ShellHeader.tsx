import { ShellIcon } from './ShellIcon';
import { ShellProfileMenu } from './ShellProfileMenu';
import { shellStyles } from './shellStyles';
import type {
  ShellThemeOption,
} from './AppShell';
import type { ThemeName } from '../../theme/tokens';

interface ShellHeaderProps {
  onLogout: () => void;
  onOpenSettings: () => void;
  onThemeChange: (theme: ThemeName) => void;
  openMenu: 'profile' | null;
  setOpenMenu: (menu: 'profile' | null) => void;
  sidebarOpen: boolean;
  subtitle: string;
  theme: ThemeName;
  themeOptions: ShellThemeOption[];
  title: string;
  toggleSidebar: () => void;
  userName: string;
}

export function ShellHeader({
  onLogout,
  onOpenSettings,
  onThemeChange,
  openMenu,
  setOpenMenu,
  sidebarOpen,
  subtitle,
  theme,
  themeOptions,
  title,
  toggleSidebar,
  userName,
}: ShellHeaderProps) {
  return (
    <header className="dashboard-shell__header" style={shellStyles.header}>
      <div className="dashboard-shell__header-start" style={shellStyles.headerStart}>
        <button
          aria-label={sidebarOpen ? 'Close left menu' : 'Open left menu'}
          onClick={toggleSidebar}
          style={shellStyles.iconButton}
          type="button"
        >
          <ShellIcon name={sidebarOpen ? 'close' : 'menu'} />
        </button>

        <div className="dashboard-shell__header-intro" style={shellStyles.headerIntro}>
          <div className="dashboard-shell__header-title" style={shellStyles.headerTitle}>{title}</div>
          <div className="dashboard-shell__header-subtitle" style={shellStyles.headerSubtitle}>{subtitle}</div>
        </div>
      </div>

      <div className="dashboard-shell__header-actions" style={shellStyles.headerActions}>
        <button
          aria-label="Open profile menu"
          onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}
          style={shellStyles.profileButton}
          type="button"
        >
          <div style={shellStyles.profileAvatar}>PI</div>
          <div className="dashboard-shell__profile-meta" style={shellStyles.profileMeta}>
            <span style={shellStyles.profileName}>{userName}</span>
            <span style={shellStyles.profileRole}>System owner</span>
          </div>
          <ShellIcon name="user" />
        </button>
      </div>

      {openMenu === 'profile' && (
        <ShellProfileMenu
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
          onThemeChange={onThemeChange}
          theme={theme}
          themeOptions={themeOptions}
          userName={userName}
        />
      )}
    </header>
  );
}
