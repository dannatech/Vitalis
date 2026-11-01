import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { AppNotification } from '../api/types';

const POLL_INTERVAL_MS = 30_000;

interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Polls GET /notifications on a timer, same cadence as the offline sync
 * engine. Deliberately not part of syncEngine.ts/Dexie: notifications are
 * server-driven read state, not something authored offline, so a plain
 * polled GET (same pattern as the Labs/Pharmacy/NCDC worklists) is enough —
 * no outbox, no offline queueing.
 */
export function useNotifications(): UseNotificationsResult {
  const { user, isDemo } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user || isDemo) return;
    try {
      const { data } = await apiClient.get<{ notifications: AppNotification[]; unreadCount: number }>(
        '/notifications',
      );
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silent — a failed poll just means the badge stays at its last known
      // value until the next tick; not worth surfacing as a page-level error.
    }
  }, [user, isDemo]);

  useEffect(() => {
    if (!user || isDemo) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, isDemo, refresh]);

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiClient.post(`/notifications/${id}/read`);
    } catch {
      // Best-effort — the next poll reconciles if this failed silently.
    }
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnreadCount(0);
    try {
      await apiClient.post('/notifications/read-all');
    } catch {
      // Best-effort — the next poll reconciles if this failed silently.
    }
  }

  return { notifications, unreadCount, markRead, markAllRead, refresh };
}
