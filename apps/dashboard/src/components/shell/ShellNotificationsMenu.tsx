import { shellStyles, getNotificationToneStyle } from './shellStyles';
import type { ShellNotification } from './AppShell';

interface ShellNotificationsMenuProps {
  notifications: ShellNotification[];
  onMarkAllNotificationsRead: () => void;
  onToggleNotificationRead: (id: string) => void;
  unreadCount: number;
}

export function ShellNotificationsMenu({
  notifications,
  onMarkAllNotificationsRead,
  onToggleNotificationRead,
  unreadCount,
}: ShellNotificationsMenuProps) {
  return (
    <div className="dashboard-shell__popover" style={shellStyles.notificationsPopover}>
      <div style={shellStyles.popoverHeader}>
        <div>
          <div style={shellStyles.popoverTitle}>Notifications</div>
          <div style={shellStyles.popoverCaption}>{unreadCount} unread</div>
        </div>
        <button onClick={onMarkAllNotificationsRead} style={shellStyles.inlineAction} type="button">
          Mark all read
        </button>
      </div>

      <div style={shellStyles.notificationList}>
        {notifications.map((notification) => (
          <button
            key={notification.id}
            onClick={() => onToggleNotificationRead(notification.id)}
            style={{
              ...shellStyles.notificationCard,
              ...(notification.read ? shellStyles.notificationCardRead : {}),
            }}
            type="button"
          >
            <span style={{ ...shellStyles.notificationTone, ...getNotificationToneStyle(notification.tone) }} />
            <span style={shellStyles.notificationBody}>
              <span style={shellStyles.notificationTitle}>{notification.title}</span>
              <span style={shellStyles.notificationDetail}>{notification.detail}</span>
            </span>
            <span style={shellStyles.notificationTime}>{notification.timeLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
