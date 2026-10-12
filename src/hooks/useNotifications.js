import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getUsersByIds } from "@/lib/userLookup";
import { coalesce } from "@/lib/coalesce";

// Lightweight unread-count badge for nav surfaces.
export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        // Only the badge number is needed here — a small page is enough and
        // keeps this read cheap since it runs on every app load.
        // A count, not a page: the badge has to be right even when there are
        // more unread notifications than one page holds.
        const unread = await base44.entities.Notification.count({
          user_id: user.id,
          read: false,
        });
        if (!cancelled) setCount(unread || 0);
      } catch {
        if (!cancelled) setCount(0);
      }
    }
    load();
    // A burst of likes/follows arrives as several events — collapse them.
    const reload = coalesce(load, 1500);
    const unsub = base44.entities.Notification.subscribe(() => reload());
    return () => {
      cancelled = true;
      reload.cancel();
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
      const actors = await getUsersByIds(actorIds);
      const actorMap = {};
      actors.forEach((a) => {
        if (a) actorMap[a.id] = a;
      });
      // A sent song arrives with only its id, so the feed can name what was
      // sent without a lookup per row.
      const sentTrackIds = [
        ...new Set(
          items.filter((n) => n.type === "track_shared" && n.track_id).map((n) => n.track_id)
        ),
      ];
      const trackMap = {};
      if (sentTrackIds.length) {
        const sent = await base44.entities.Track.filter(
          { id: { $in: sentTrackIds } },
          "-created_date",
          50
        );
        sent.forEach((t) => {
          trackMap[t.id] = t;
        });
      }
      setNotifications(
        items.map((n) => ({
          ...n,
          actor: actorMap[n.actor_id] || null,
          track: trackMap[n.track_id] || null,
        }))
      );
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    const reload = coalesce(load, 1500);
    const unsub = base44.entities.Notification.subscribe(() => reload());
    return () => {
      reload.cancel();
      unsub();
    };
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