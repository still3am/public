import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const LikesContext = createContext(null);

// The current user's liked track ids, loaded once and shared by every track
// menu — so a menu can tell "Like" from "Unlike" without a query per row.
export function LikesProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(new Set());
  const pending = useRef(new Set());

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setIds(new Set());
      return;
    }
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

  // Optimistic: the heart flips immediately, then the call confirms it (and
  // writes the public like count server-side) or rolls the flip back.
  const toggleLike = useCallback(
    async (track) => {
      const trackId = track?.id;
      if (!user?.id || !trackId || pending.current.has(trackId)) return false;
      const wasLiked = ids.has(trackId);
      pending.current.add(trackId);
      setIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(trackId);
        else next.add(trackId);
        return next;
      });
      try {
        await base44.functions.invoke("trackLike", {
          track_id: trackId,
          liked: !wasLiked,
        });
        return !wasLiked;
      } catch {
        setIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(trackId);
          else next.delete(trackId);
          return next;
        });
        return wasLiked;
      } finally {
        pending.current.delete(trackId);
      }
    },
    [user?.id, ids]
  );

  return (
    <LikesContext.Provider
      value={{ isLiked: (id) => ids.has(id), toggleLike, count: ids.size }}
    >
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  const ctx = useContext(LikesContext);
  if (!ctx) return { isLiked: () => false, toggleLike: async () => false, count: 0 };
  return ctx;
}