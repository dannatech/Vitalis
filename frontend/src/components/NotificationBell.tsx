import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../notifications/useNotifications';
import { BellIcon } from './NavIcons';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function handleClick(id: string, link: string | null) {
    setOpen(false);
    await markRead(id);
    if (link) navigate(link);
  }

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="notification-bell-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <div className="notification-backdrop" onClick={() => setOpen(false)} />
          <div className="notification-panel">
            <div className="notification-panel-header">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <button type="button" className="link-button" onClick={() => void markAllRead()}>
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="empty-state">No notifications yet.</p>
            ) : (
              <ul className="notification-list">
                {notifications.map((n) => (
                  <li key={n.id} className={n.readAt ? '' : 'unread'}>
                    <button type="button" onClick={() => void handleClick(n.id, n.link)}>
                      <span className="notification-message">{n.message}</span>
                      <span className="notification-time">{timeAgo(n.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
