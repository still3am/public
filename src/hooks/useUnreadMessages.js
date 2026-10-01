import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { coalesce } from "@/lib/coalesce";

// Unread DM badge for nav surfaces.
export function useUnreadMessages() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const rows = await base44.entities.Message.filter(
          { recipient_id: user.id, read: false },
          "-created_date",
          50
        );
        if (!cancelled) setCount((rows || []).length);
      } catch {
        if (!cancelled) setCount(0);
      }
    }

    load();
    const reload = coalesce(load, 1200);
    const unsub = base44.entities.Message.subscribe(() => reload());
    return () => {
      cancelled = true;
      reload.cancel();
      unsub();
    };
  }, [user]);

  return count;
}