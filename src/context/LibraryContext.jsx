import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { coalesce } from "@/lib/coalesce";

const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(new Set());

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setIds(new Set());
      return;
    }
    try {
      const items = await base44.entities.LibraryItem.filter(
        { user_id: user.id },
        "-created_date",
        1000
      );
      setIds(new Set((items || []).map((i) => i.track_id).filter(Boolean)));
    } catch {
      /* keep current set */
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;
    const reload = coalesce(refresh, 1200);
    const unsub = base44.entities.LibraryItem.subscribe(() => reload());
    return () => {
      reload.cancel();
      unsub();
    };
  }, [user?.id, refresh]);

  const toggle = useCallback(
    async (track) => {
      if (!user?.id || !track?.id) return false;
      const isIn = ids.has(track.id);
      try {
        if (isIn) {
          await base44.entities.LibraryItem.deleteMany({
            user_id: user.id,
            track_id: track.id,
          });
          setIds((prev) => {
            const n = new Set(prev);
            n.delete(track.id);
            return n;
          });
        } else {
          await base44.entities.LibraryItem.create({
            user_id: user.id,
            track_id: track.id,
          });
          setIds((prev) => new Set(prev).add(track.id));
        }
        return true;
      } catch {
        return false;
      }
    },
    [user?.id, ids]
  );

  return (
    <LibraryContext.Provider
      value={{ ids, isInLibrary: (id) => ids.has(id), toggle, refresh, count: ids.size }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    return {
      ids: new Set(),
      isInLibrary: () => false,
      toggle: async () => false,
      refresh: async () => {},
      count: 0,
    };
  }
  return ctx;
}