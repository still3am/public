import { useCallback, useEffect, useRef, useState } from "react";
import {
  putTrack,
  putCoverArt,
  listRecords,
  deleteRecord,
  clearAll,
} from "@/lib/offlineCache";

const EVT = "offlinecache:change";

export function useOfflineCache() {
  const [cachedIds, setCachedIds] = useState(null);
  const [records, setRecords] = useState([]);
  const [downloading, setDownloading] = useState({});
  const coverBackfillDone = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const all = await listRecords();
      all.sort((a, b) => (b._savedAt || 0) - (a._savedAt || 0));
      setRecords(all);
      setCachedIds(new Set(all.map((r) => r.id)));
      // Backfill cover-art blobs for legacy saves (once per session, online only).
      if (
        !coverBackfillDone.current &&
        typeof navigator !== "undefined" &&
        navigator.onLine &&
        all.some((r) => r.cover_art_url && !r._coverBlob)
      ) {
        coverBackfillDone.current = true;
        (async () => {
          let changed = false;
          for (const r of all) {
            if (!r.cover_art_url || r._coverBlob) continue;
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
    window.dispatchEvent(new CustomEvent(EVT));
  }, []);

  const clearAllCache = useCallback(async () => {
    await clearAll();
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
    clearAllCache,
  };
}