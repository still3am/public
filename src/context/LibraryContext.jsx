import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { coalesce } from "@/lib/coalesce";

const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(new Set());
  // Mirror of `ids` so toggle() can read current membership without being
  // re-created on every change (which made rapid taps race each other).
  const idsRef = useRef(ids);
  // Track ids with an in-flight write, so repeated taps can't queue up
  // conflicting create/delete calls for the same track.
  const pendingRef = useRef(new Set());

  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setIds(new Set());
      return;
    }
    // A server read that lands mid-write would show a state the backend hasn't
    // accepted yet — the write's own change event refreshes us afterwards.
    if (pendingRef.current.size) return;
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

  // Optimistic: the UI updates on tap and rolls back if the backend rejects it,
  // so a track can never sit in the library showing as saved when it isn't.
  const toggle = useCallback(
    async (track) => {
      const id = track?.id;
      if (!user?.id || !id) return false;
      if (pendingRef.current.has(id)) return false;
      const wasIn = idsRef.current.has(id);
      pendingRef.current.add(id);

      setIds((prev) => {
        const next = new Set(prev);
        if (wasIn) next.delete(id);else next.add(id);
        return next;
      });

      try {
        if (wasIn) {
          const recs = await base44.entities.LibraryItem.filter(
            { user_id: user.id, track_id: id },
            "-created_date",
            5
          );
          await Promise.all(
            (recs || []).map((r) => base44.entities.LibraryItem.delete(r.id))
          );
        } else {
          await base44.entities.LibraryItem.create({
            user_id: user.id,
            track_id: id,
          });
        }
        return true;
      } catch {
        setIds((prev) => {
          const next = new Set(prev);
          if (wasIn) next.add(id);else next.delete(id);
          return next;
        });
        return false;
      } finally {
        pendingRef.current.delete(id);
      }
    },
    [user?.id]
  );

  // Bulk removal for the library's selection mode: one optimistic update for the
  // whole selection, with a full rollback if the backend rejects it. Deletes are
  // sent in small batches so a large selection can't trip the read/write limits.
  const removeMany = useCallback(
    async (trackIds) => {
      const list = (trackIds || []).filter(Boolean);
      if (!user?.id || !list.length) return false;
      const held = list.filter((id) => idsRef.current.has(id));
      if (!held.length) return true;
      held.forEach((id) => pendingRef.current.add(id));

      setIds((prev) => {
        const next = new Set(prev);
        held.forEach((id) => next.delete(id));
        return next;
      });

      try {
        const recs = await base44.entities.LibraryItem.filter(
          { user_id: user.id, track_id: { $in: held } },
          "-created_date",
          1000
        );
        const rows = recs || [];
        for (let i = 0; i < rows.length; i += 10) {
          await Promise.all(
            rows.slice(i, i + 10).map((r) => base44.entities.LibraryItem.delete(r.id))
          );
        }
        return true;
      } catch {
        setIds((prev) => {
          const next = new Set(prev);
          held.forEach((id) => next.add(id));
          return next;
        });
        return false;
      } finally {
        held.forEach((id) => pendingRef.current.delete(id));
      }
    },
    [user?.id]
  );

  return (
    <LibraryContext.Provider
      value={{
        ids,
        isInLibrary: (id) => ids.has(id),
        toggle,
        removeMany,
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
      isInLibrary: () => false,
      toggle: async () => false,
      removeMany: async () => false,
      refresh: async () => {},
      count: 0,
    };
  }
  return ctx;
}