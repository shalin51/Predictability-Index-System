import { ShellIcon } from './ShellIcon';
import { shellStyles } from './shellStyles';
import type { ShellThemeOption } from './AppShell';
import type { ThemeName } from '../../theme/tokens';

interface ShellProfileMenuProps {
  onLogout: () => void;
  onOpenSettings: () => void;
  onThemeChange: (theme: ThemeName) => void;
  theme: ThemeName;
  themeOptions: ShellThemeOption[];
  userName: string;
}

export function ShellProfileMenu({
  onLogout,
  onOpenSettings,
  onThemeChange,
  theme,
  themeOptions,
  userName,
}: ShellProfileMenuProps) {
  return (
    <div className="dashboard-shell__popover" style={shellStyles.profilePopover}>
      <div style={shellStyles.profilePopoverHeader}>
        <div style={shellStyles.profileAvatarLarge}>PI</div>
        <div>
          <div style={shellStyles.popoverTitle}>Predictability Index</div>
          <div style={shellStyles.popoverCaption}>{userName}</div>
        </div>
      </div>

      <button onClick={onOpenSettings} style={shellStyles.menuButton} type="button">
        <ShellIcon name="settings" />
        Open settings
      </button>

      <button onClick={onLogout} style={shellStyles.menuButton} type="button">
        <ShellIcon name="user" />
        Sign out
      </button>

      <div style={shellStyles.profileThemeBlock}>
        <div style={shellStyles.navGroupLabel}>Theme preset</div>
        <div style={shellStyles.profileThemeGrid}>
          {themeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => onThemeChange(option.id)}
              style={{
                ...shellStyles.themeOptionButton,
                ...(theme === option.id ? shellStyles.themeOptionButtonActive : {}),
              }}
              type="button"
            >
              <span style={shellStyles.themeOptionTitle}>{option.label}</span>
              <span style={shellStyles.themeOptionDescription}>{option.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
