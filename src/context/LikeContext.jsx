import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const LikeContext = createContext(null);

export function LikeProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set());

  const load = useCallback(async () => {
    if (!user?.id) {
      setIds(new Set());
      return;
    }
    const rows = await base44.entities.Like.filter({ user_id: user.id }, "-created_date", 500);
    setIds(new Set((rows || []).map((r) => r.track_id)));
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const isLiked = useCallback((trackId) => ids.has(trackId), [ids]);

  // Optimistic: flip locally, reconcile with the server's answer, roll back on failure.
  const toggle = useCallback(
    async (track) => {
      if (!track?.id || !user?.id) return null;
      const wasLiked = ids.has(track.id);
      const flip = (to) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (to) next.add(track.id);
          else next.delete(track.id);
          return next;
        });

      flip(!wasLiked);
      try {
        const res = await base44.functions.invoke("toggleTrackLike", { track_id: track.id });
        const data = res?.data || {};
        flip(!!data.liked);
        return data;
      } catch (e) {
        flip(wasLiked);
        throw e;
      }
    },
    [ids, user?.id]
  );

  return (
    <LikeContext.Provider value={{ ids, isLiked, toggle, count: ids.size, refresh: load }}>
      {children}
    </LikeContext.Provider>
  );
}

export function useLikes() {
  const ctx = useContext(LikeContext);
  if (!ctx) {
    return {
      ids: new Set(),
      isLiked: () => false,
      toggle: async () => null,
      count: 0,
      refresh: async () => {},
    };
  }
  return ctx;
}