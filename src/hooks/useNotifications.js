import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// Lightweight unread-count badge for nav surfaces.
export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const items = await base44.entities.Notification.filter(
          { user_id: user.id, read: false },
          "-created_date",
          100
        );
        if (!cancelled) setCount(items.length);
      } catch {
        if (!cancelled) setCount(0);
      }
    }
    load();
    const unsub = base44.entities.Notification.subscribe(() => load());
    return () => {
      cancelled = true;
      unsub();
    };
  }, [user]);

  return count;
}

// Full notifications list with actor enrichment, for the Notifications page.
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const items = await base44.entities.Notification.filter(
        { user_id: user.id },
        "-created_date",
        50
      );
      const actorIds = [...new Set(items.map((n) => n.actor_id).filter(Boolean))];
      const actors = await Promise.all(
        actorIds.map((id) => base44.entities.User.get(id).catch(() => null))
      );
      const actorMap = {};
      actors.forEach((a) => {
        if (a) actorMap[a.id] = a;
      });
      setNotifications(items.map((n) => ({ ...n, actor: actorMap[n.actor_id] || null })));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    const unsub = base44.entities.Notification.subscribe(() => load());
    return unsub;
  }, [load]);

  async function markAllAsRead() {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await base44.entities.Notification.bulkUpdate(
        unread.map((n) => ({ id: n.id, read: true }))
      );
    } catch {
      setNotifications((prev) =>
        prev.map((n) =>
          unread.find((u) => u.id === n.id) ? { ...n, read: false } : n
        )
      );
    }
  }

  async function markAsRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await base44.entities.Notification.update(id, { read: true });
    } catch {}
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    markAllAsRead,
    markAsRead,
    reload: load,
  };
}