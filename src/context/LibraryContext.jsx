import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { coalesce } from "@/lib/coalesce";
import { getLibraryItems, invalidateLibraryItems } from "@/lib/libraryData";

const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [ids, setIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // One shared read serves the id set, the record list (tags) and the playlist
  // pickers, instead of each of them reading the collection separately.
  const refresh = useCallback(
    async ({ force = false } = {}) => {
      if (!user?.id) {
        setItems([]);
        setIds(new Set());
        setLoading(false);
        return;
      }
      if (force) invalidateLibraryItems();
      const rows = await getLibraryItems(user.id);
      setItems(rows || []);
      setIds(new Set((rows || []).map((i) => i.track_id).filter(Boolean)));
      setLoading(false);
    },
    [user?.id]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;
    const reload = coalesce(() => refresh({ force: true }), 1500);
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
        invalidateLibraryItems();
        if (isIn) {
          const recs = await base44.entities.LibraryItem.filter(
            { user_id: user.id, track_id: track.id },
            "-created_date",
            5
          );
          await Promise.all(
            (recs || []).map((r) => base44.entities.LibraryItem.delete(r.id))
          );
          setIds((prev) => {
            const n = new Set(prev);
            n.delete(track.id);
            return n;
          });
          setItems((prev) => prev.filter((i) => i.track_id !== track.id));
        } else {
          const created = await base44.entities.LibraryItem.create({
            user_id: user.id,
            track_id: track.id,
          });
          setIds((prev) => new Set(prev).add(track.id));
          if (created) setItems((prev) => [...prev, created]);
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
      value={{
        ids,
        items,
        loading,
        isInLibrary: (id) => ids.has(id),
        toggle,
        refresh,
        count: ids.size,
      }}
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
      items: [],
      loading: false,
      isInLibrary: () => false,
      toggle: async () => false,
      refresh: async () => {},
      count: 0,
    };
  }
  return ctx;
}