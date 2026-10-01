import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// Shared like state. Every track menu in the app reads this one source, so
// liking a track anywhere updates the label everywhere at once.
const LikesContext = createContext(null);

export function LikesProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(new Set());
  const idsRef = useRef(ids);
  const pendingRef = useRef(new Set());

  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setIds(new Set());
      return;
    }
    if (pendingRef.current.size) return;
    try {
      const rows = await base44.entities.Like.filter(
        { user_id: user.id },
        "-created_date",
        2000
      );
      setIds(new Set((rows || []).map((r) => r.track_id).filter(Boolean)));
    } catch {
      /* keep the current set */
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.Like.subscribe(() => refresh());
    return unsub;
  }, [user?.id, refresh]);

  // Optimistic with rollback: the badge never keeps a state the backend rejected.
  const toggle = useCallback(
    async (track) => {
      const id = track?.id;
      if (!user?.id || !id) return false;
      if (pendingRef.current.has(id)) return false;
      const wasLiked = idsRef.current.has(id);
      pendingRef.current.add(id);

      setIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(id);else next.add(id);
        return next;
      });

      try {
        const res = await base44.functions.invoke("toggleLike", { track_id: id });
        const liked = res?.data?.liked;
        if (typeof liked === "boolean" && liked !== !wasLiked) {
          setIds((prev) => {
            const next = new Set(prev);
            if (liked) next.add(id);else next.delete(id);
            return next;
          });
        }
        return true;
      } catch {
        setIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(id);else next.delete(id);
          return next;
        });
        return false;
      } finally {
        pendingRef.current.delete(id);
      }
    },
    [user?.id]
  );

  return (
    <LikesContext.Provider
      value={{ ids, isLiked: (id) => ids.has(id), toggle, refresh, count: ids.size }}
    >
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  const ctx = useContext(LikesContext);
  if (!ctx) {
    return {
      ids: new Set(),
      isLiked: () => false,
      toggle: async () => false,
      refresh: async () => {},
      count: 0,
    };
  }
  return ctx;
}