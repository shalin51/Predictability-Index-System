import type { RefObject } from 'react';
import { ShellSystemStatus } from './ShellSystemStatus';
import { ShellIcon } from './ShellIcon';
import { shellStyles } from './shellStyles';
import type { ShellNavItem } from './AppShell';

interface ShellSidebarProps<T extends string> {
  activeView: T;
  navItems: readonly ShellNavItem<T>[];
  onNavigate: (view: T) => void;
  overviewView: T;
  scrolling: boolean;
  sidebarOpen: boolean;
  sidebarRef: RefObject<HTMLElement>;
}

export function ShellSidebar<T extends string>({
  activeView,
  navItems,
  onNavigate,
  overviewView,
  scrolling,
  sidebarOpen,
  sidebarRef,
}: ShellSidebarProps<T>) {
  const groupedNav = navItems.reduce<Record<string, Array<ShellNavItem<T>>>>((acc, item) => {
    acc[item.group] = acc[item.group] ?? [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <aside
      className={`dashboard-shell__sidebar ${scrolling ? 'dashboard-shell__scrolling' : ''}`}
      ref={sidebarRef}
      style={{
        ...shellStyles.sidebar,
        ...(sidebarOpen ? {} : shellStyles.sidebarCollapsed),
      }}
    >
      <div style={{ ...shellStyles.brandBlock, ...(sidebarOpen ? {} : shellStyles.brandBlockCollapsed) }}>
        <div style={shellStyles.brandBadge}>PI</div>
        {sidebarOpen && (
          <div>
            <div style={shellStyles.brandTitle}>Predictability Index</div>
            <div style={shellStyles.brandSubtitle}>Operations dashboard</div>
          </div>
        )}
      </div>

      <div style={shellStyles.navStack}>
        {Object.entries(groupedNav).map(([group, items]) => (
          <div key={group} style={shellStyles.navGroup}>
            {sidebarOpen && <div style={shellStyles.navGroupLabel}>{group}</div>}
            <div style={shellStyles.navList}>
              {items.map((item) => {
                const active = item.id === activeView;

                return (
                  <button
                    aria-current={active ? 'page' : undefined}
                    className={`dashboard-shell__nav-button${active ? ' dashboard-shell__nav-button--active' : ''}`}
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    style={{
                      ...shellStyles.navButton,
                      ...(sidebarOpen ? {} : shellStyles.navButtonCollapsed),
                    }}
                    title={item.label}
                    type="button"
                  >
                    <span
                      className={`dashboard-shell__nav-icon-wrap${active ? ' dashboard-shell__nav-icon-wrap--active' : ''}`}
                      style={shellStyles.navIconWrap}
                    >
                      <ShellIcon name={item.icon} />
                    </span>
                    {sidebarOpen && (
                      <span style={shellStyles.navTextWrap}>
                        <span style={shellStyles.navLabel}>{item.label}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ ...shellStyles.statusWrap, ...(sidebarOpen ? {} : shellStyles.statusWrapCollapsed) }}>
          <ShellSystemStatus compact={!sidebarOpen} onOpenOverview={() => onNavigate(overviewView)} />
        </div>
      </div>
    </aside>
  );
}
