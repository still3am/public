import { useCallback, useEffect, useState } from "react";
import {
  putTrack,
  listRecords,
  deleteRecord,
  clearAll,
} from "@/lib/offlineCache";

const EVT = "offlinecache:change";

export function useOfflineCache() {
  const [cachedIds, setCachedIds] = useState(null);
  const [records, setRecords] = useState([]);
  const [downloading, setDownloading] = useState({});

  const refresh = useCallback(async () => {
    try {
      const all = await listRecords();
      all.sort((a, b) => (b._savedAt || 0) - (a._savedAt || 0));
      setRecords(all);
      setCachedIds(new Set(all.map((r) => r.id)));
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
      await putTrack(track, blob);
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