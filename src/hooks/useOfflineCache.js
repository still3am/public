import { useCallback, useEffect, useRef, useState } from "react";
import {
  putTrack,
  getRecord,
  putCoverArt,
  listRecords,
  deleteRecord,
  clearAll,
  getOrderIds,
  setOrderIds,
  clearMeta,
} from "@/lib/offlineCache";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  getCloudList,
  setCloudList,
  addCloudTrack,
  removeCloudTrack,
} from "@/lib/offlineSync";

const EVT = "offlinecache:change";
// Module-level guard so multiple hook instances don't auto-download the same
// cloud track twice in one session.
const autoQueued = new Set();
const downloadingIds=new Set();
let generation=0;
window.addEventListener('account:cleared',()=>{generation++;autoQueued.clear();downloadingIds.clear();});

// PUBLIC files (covers) are served as a generic octet-stream; a blob: URL only
// renders in an <img> when its MIME is image/*, so sniff the magic bytes and
// re-type the stored blob accordingly.
async function toImageBlob(res) {
  const raw = await res.blob();
  if (raw.type && raw.type.startsWith("image/")) return raw;
  const buf = await raw.arrayBuffer();
  const b = new Uint8Array(buf);
  let type = "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    type = "image/png";
  } else if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x42 && b[10] === 0x50 && b[11] === 0x50
  ) {
    type = "image/webp";
  } else if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    type = "image/gif";
  }
  return new Blob([buf], { type });
}

export function useOfflineCache() {
  const [cachedIds, setCachedIds] = useState(null);
  const [records, setRecords] = useState([]);
  const [downloading, setDownloading] = useState({});
  const backfilled = useRef(new Set());
  const { user } = useAuth();

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
          (r) =>
            r.cover_art_url &&
            !backfilled.current.has(r.id) &&
            (!r._coverBlob || !r._coverBlob.type || !r._coverBlob.type.startsWith("image/"))
        );
        if (need.length) {
          need.forEach((r) => backfilled.current.add(r.id));
          (async () => {
            let changed = false;
            for (const r of need) {
              try {
                const res = await fetch(r.cover_art_url);
                if (res.ok) {
                  await putCoverArt(r.id, await toImageBlob(res));
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
    if (!user?.id || !track?.id) return false;
    if(downloadingIds.has(track.id))return false;
    downloadingIds.add(track.id);
    const startedGeneration=generation;
    setDownloading((s) => ({ ...s, [track.id]: true }));
    try {
      const authorized=await base44.entities.Track.get(track.id);
      if(authorized.is_downloadable!==true)throw new Error("Download permission was removed");
      track=authorized;
      if(!track.audio_url)throw new Error("Audio link is unavailable");
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),60000);
      let blob;
      try{
      const res = await fetch(track.audio_url,{signal:controller.signal});
      if (!res.ok) throw new Error("Download failed");
      blob = await res.blob();
      if(!blob.size||blob.type.includes("text/html")||blob.type.includes("application/json"))throw new Error("Invalid audio download");
      }finally{clearTimeout(timer);}
      // Best-effort: cache the cover-art image too so it renders offline.
      let coverBlob = null;
      try {
        if (track.cover_art_url) {
        const cres = await fetch(track.cover_art_url,{signal:AbortSignal.timeout(10000)});
        if (cres.ok) coverBlob = await toImageBlob(cres);
        }
      } catch {}
      if(startedGeneration!==generation)throw new Error("Account changed during download");
      await putTrack(track, blob, coverBlob);
      const stored=await getRecord(track.id);
      if(!stored?._blob?.size)throw new Error("Audio did not persist");
      // Keep the saved download order in sync: a freshly saved track goes to
      // the top so it's easy to find (matching the previous newest-first view).
      const order = (await getOrderIds()) || [];
      await setOrderIds([track.id, ...order.filter((id) => id !== track.id)]).catch(()=>{});
      // Mirror this save into the user's cloud offline list so other devices
      // auto-download it too.
      if (user?.id) addCloudTrack(user.id, track).catch(() => {});
      window.dispatchEvent(new CustomEvent(EVT));
      return true;
    } catch {
      return false;
    } finally {
      downloadingIds.delete(track.id);
      setDownloading((s) => ({ ...s, [track.id]: false }));
    }
  }, [user?.id]);

  // Pull the user's cloud-synced offline list and download any tracks that
  // aren't on this device yet, so the same songs are available offline everywhere.
  const syncFromCloud = useCallback(async () => {
    if (!user?.id || !cachedIds) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const cloud = await getCloudList(user.id);
    for (const saved of cloud) {
      const t=await base44.entities.Track.get(saved.id).catch(()=>null);
      if(!t || !t.is_downloadable) continue;
      if (cachedIds.has(t.id) || autoQueued.has(t.id)) continue;
      autoQueued.add(t.id);
      downloadTrack(t).then(ok=>{if(!ok)autoQueued.delete(t.id);}).catch(()=>autoQueued.delete(t.id));
    }
  }, [user?.id, cachedIds, downloadTrack]);

  useEffect(() => {
    syncFromCloud();
  }, [syncFromCloud]);

  // When another device updates the cloud offline list, re-read it here.
  useEffect(() => {
    if (!user?.id) return;
    let unsub=()=>{};try{unsub=base44.entities.OfflineSync.subscribe(()=>syncFromCloud());}catch{}
    return unsub;
  }, [user?.id, syncFromCloud]);

  const removeTrack = useCallback(async (id) => {
    await deleteRecord(id);
    const order = await getOrderIds();
    if (order) await setOrderIds(order.filter((x) => x !== id));
    if (user?.id) removeCloudTrack(user.id, id).catch(() => {});
    window.dispatchEvent(new CustomEvent(EVT));
  }, [user?.id]);

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
    autoQueued.clear();
    if (user?.id) setCloudList(user.id, []).catch(() => {});
    window.dispatchEvent(new CustomEvent(EVT));
  }, [user?.id]);

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