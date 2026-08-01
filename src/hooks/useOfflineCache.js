import { useCallback, useEffect, useRef, useState } from "react";
import {
  putTrack,
  putCoverArt,
  listRecords,
  deleteRecord,
  clearAll,
  getOrderIds,
  setOrderIds,
  clearMeta,
} from "@/lib/offlineCache";

const EVT = "offlinecache:change";

export function useOfflineCache() {
  const [cachedIds, setCachedIds] = useState(null);
  const [records, setRecords] = useState([]);
  const [downloading, setDownloading] = useState({});
  const backfilled = useRef(new Set());

  const applyOrder = useCallback((all, orderIds) => {
    if (!orderIds || !orderIds.length) {
      return [...all].sort((a, b) => (b._savedAt || 0) - (a._savedAt || 0));
    }
    const byId = new Map(all.map((r) => [r.id, r]));
    const ordered = orderIds.map((id) => byId.get(id)).filter(Boolean);
    const leftover = all
      .filter((r) => !orderIds.includes(r.id))
      .sort((a, b) => (b._savedAt || 0) - (a._savedAt || 0));
    // New downloads (not yet in the saved order) stay on top; the user's custom
    // arrangement follows below.
    return [...leftover, ...ordered];
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [all, orderIds] = await Promise.all([listRecords(), getOrderIds()]);
      setRecords(applyOrder(all, orderIds));
      setCachedIds(new Set(all.map((r) => r.id)));
      // Backfill cover-art blobs for any saved track still missing one. Runs
      // whenever we're online, retrying each record once per session so a
      // dropped fetch doesn't permanently strand a cover offline.
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const need = all.filter(
          (r) => r.cover_art_url && !r._coverBlob && !backfilled.current.has(r.id)
        );
        if (need.length) {
          need.forEach((r) => backfilled.current.add(r.id));
          (async () => {
            let changed = false;
            for (const r of need) {
              try {
                const res = await fetch(r.cover_art_url);
                if (res.ok) {
                  await putCoverArt(r.id, await res.blob());
                  changed = true;
                }
              } catch {}
            }
            if (changed) window.dispatchEvent(new CustomEvent(EVT));
          })();
        }
      }
    } catch {
      setCachedIds(new Set());
      setRecords([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(EVT, onChange);
    return () => window.removeEventListener(EVT, onChange);
  }, [refresh]);

  const downloadTrack = useCallback(async (track) => {
    if (!track?.audio_url) return false;
    setDownloading((s) => ({ ...s, [track.id]: true }));
    try {
      const res = await fetch(track.audio_url);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      // Best-effort: cache the cover-art image too so it renders offline.
      let coverBlob = null;
      try {
        if (track.cover_art_url) {
          const cres = await fetch(track.cover_art_url);
          if (cres.ok) coverBlob = await cres.blob();
        }
      } catch {}
      await putTrack(track, blob, coverBlob);
      // Keep the saved download order in sync: a freshly saved track goes to
      // the top so it's easy to find (matching the previous newest-first view).
      const order = (await getOrderIds()) || [];
      await setOrderIds([track.id, ...order.filter((id) => id !== track.id)]);
      window.dispatchEvent(new CustomEvent(EVT));
      return true;
    } catch {
      return false;
    } finally {
      setDownloading((s) => ({ ...s, [track.id]: false }));
    }
  }, []);

  const removeTrack = useCallback(async (id) => {
    await deleteRecord(id);
    const order = await getOrderIds();
    if (order) await setOrderIds(order.filter((x) => x !== id));
    window.dispatchEvent(new CustomEvent(EVT));
  }, []);

  const reorder = useCallback(async (orderedIds) => {
    // Optimistic local re-order so the drag feels instant, then persist.
    setRecords((prev) => {
      const byId = new Map(prev.map((r) => [r.id, r]));
      const next = orderedIds.map((id) => byId.get(id)).filter(Boolean);
      next.push(...prev.filter((r) => !orderedIds.includes(r.id)));
      return next;
    });
    await setOrderIds(orderedIds);
    window.dispatchEvent(new CustomEvent(EVT));
  }, []);

  const clearAllCache = useCallback(async () => {
    await clearAll();
    await clearMeta();
    window.dispatchEvent(new CustomEvent(EVT));
  }, []);

  return {
    cachedIds: cachedIds || new Set(),
    records,
    downloading,
    loading: cachedIds === null,
    refresh,
    isCached: (id) => (cachedIds ? cachedIds.has(id) : false),
    downloadTrack,
    removeTrack,
    reorder,
    clearAllCache,
  };
}