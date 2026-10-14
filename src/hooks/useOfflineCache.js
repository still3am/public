import { useCallback, useEffect, useRef, useState } from "react";
import {
  requestPersistentStorage,
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
const suppressedFor=userId=>{try{return new Set(JSON.parse(localStorage.getItem("public:offline:suppressed:"+userId)||"[]"));}catch{return new Set();}};
const suppress=(userId,ids,remove=false)=>{if(!userId)return;try{const set=suppressedFor(userId);ids.forEach(id=>remove?set.delete(id):set.add(id));localStorage.setItem("public:offline:suppressed:"+userId,JSON.stringify([...set]));}catch{}};

// Module-level guard so multiple hook instances don't auto-download the same
// cloud track twice in one session.
const autoQueued = new Set(),retryAfter=new Map();
const downloadingIds=new Set(),removalVersions=new Map(),cloudSyncJobs=new Map();
let generation=0;
window.addEventListener('account:cleared',()=>{generation++;autoQueued.clear();retryAfter.clear();downloadingIds.clear();removalVersions.clear();cloudSyncJobs.clear();});

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
  const backfilled = useRef(new Set()),refreshVersion=useRef(0);
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
    const request=++refreshVersion.current,startedGeneration=generation;
    try {
      const [all, orderIds] = await Promise.all([listRecords(), getOrderIds()]);
      if(request!==refreshVersion.current||startedGeneration!==generation)return;
      if(all.length)requestPersistentStorage();
      setRecords(applyOrder(all,orderIds));
      const next=new Set(all.map(record=>record.id));
      setCachedIds(previous=>previous&&previous.size===next.size&&[...next].every(id=>previous.has(id))?previous:next);
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
      // A temporary storage failure must not erase a collection already shown.
      if(request===refreshVersion.current&&startedGeneration===generation)setCachedIds(previous=>previous||new Set());
    }
  }, []);

  useEffect(() => {
    refresh();
    return()=>{refreshVersion.current++;};
  }, [refresh]);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(EVT, onChange);
    return () => window.removeEventListener(EVT, onChange);
  }, [refresh]);

  const downloadTrack = useCallback(async (track,{automatic=false}={}) => {
    if (!user?.id || !track?.id) return false;
    if(downloadingIds.has(track.id))return false;
    downloadingIds.add(track.id);
    retryAfter.delete(track.id);
    requestPersistentStorage();
    const startedGeneration=generation,startedRemoval=removalVersions.get(track.id)||0;
    setDownloading((s) => ({ ...s, [track.id]: true }));
    try {
      const authorized=await base44.entities.Track.get(track.id);
      if(!authorized?.id||authorized.id!==track.id)throw new Error("Track unavailable");
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
      if(startedGeneration!==generation||startedRemoval!==(removalVersions.get(track.id)||0)||(automatic&&suppressedFor(user.id).has(track.id)))throw new Error("Offline save was canceled");
      await putTrack(track, blob, coverBlob);
      if(startedGeneration!==generation||startedRemoval!==(removalVersions.get(track.id)||0)||(automatic&&suppressedFor(user.id).has(track.id))){await deleteRecord(track.id);throw new Error("Offline save was canceled");}
      const stored=await getRecord(track.id);
      if(!stored?._blob?.size)throw new Error("Audio did not persist");
      // Keep the saved download order in sync: a freshly saved track goes to
      // the top so it's easy to find (matching the previous newest-first view).
      const order = (await getOrderIds().catch(()=>[])) || [];
      await setOrderIds([track.id, ...order.filter((id) => id !== track.id)]).catch(()=>{});
      // Mirror this save into the user's cloud offline list so other devices
      // auto-download it too.
      if (user?.id) addCloudTrack(user.id, track).catch(() => {});
      if(!automatic)suppress(user.id,[track.id],true);
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
  const syncFromCloud=useCallback(async()=>{
    const uid=user?.id;
    if(!uid||!cachedIds||cloudSyncJobs.has(uid)||!navigator.onLine)return;
    const job=Symbol(uid),startedGeneration=generation;cloudSyncJobs.set(uid,job);
    try{
      const cloud=await getCloudList(uid);let cursor=0;
      const worker=async()=>{while(cursor<cloud.length){
        if(startedGeneration!==generation)return;
        const track=cloud[cursor++],id=track?.id;
        if(!id||cachedIds.has(id)||autoQueued.has(id)||suppressedFor(uid).has(id))continue;
        if((retryAfter.get(id)||0)>Date.now())continue;
        autoQueued.add(id);
        try{
          // Check the device itself; a remembered download is not proof that
          // the browser still has its audio after storage eviction.
          const stored=await getRecord(id);
          if(startedGeneration!==generation)return;
          if(stored?._blob?.size)continue;
          const ok=await downloadTrack(track,{automatic:true});
          if(!ok)retryAfter.set(id,Date.now()+60000);
        }finally{autoQueued.delete(id);}
      }};
      await Promise.all([worker(),worker()]);
    }catch{/* Keep this device's confirmed offline collection. */}
    finally{if(cloudSyncJobs.get(uid)===job)cloudSyncJobs.delete(uid);}
  },[user?.id,cachedIds,downloadTrack]);

  useEffect(() => {
    syncFromCloud();
  }, [syncFromCloud]);

  // When another device updates the cloud offline list, re-read it here.
  useEffect(() => {
    if (!user?.id) return;
    let unsub=()=>{};try{unsub=base44.entities.OfflineSync.subscribe(()=>syncFromCloud());}catch{}
    return unsub;
  }, [user?.id, syncFromCloud]);

  useEffect(()=>{
    const recover=()=>{if(document.visibilityState==="hidden")return;refresh();syncFromCloud();};
    window.addEventListener('online',recover);
    window.addEventListener('focus',recover);
    document.addEventListener('visibilitychange',recover);
    return()=>{window.removeEventListener('online',recover);window.removeEventListener('focus',recover);document.removeEventListener('visibilitychange',recover);};
  },[refresh,syncFromCloud]);

  const removeTrack=useCallback(async id=>{
    try{
      await deleteRecord(id);removalVersions.set(id,(removalVersions.get(id)||0)+1);suppress(user?.id,[id]);
      const order=await getOrderIds().catch(()=>null);
      if(order)await setOrderIds(order.filter(value=>value!==id)).catch(()=>{});
      if(user?.id)removeCloudTrack(user.id,id).catch(()=>{});
      window.dispatchEvent(new CustomEvent(EVT));return true;
    }catch{return false;}
  },[user?.id]);

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

  const clearAllCache=useCallback(async()=>{
    const removed=[...new Set([...records.map(track=>track.id),...autoQueued,...downloadingIds])];
    try{
      await clearAll();generation++;suppress(user?.id,removed);
      await clearMeta().catch(()=>{});autoQueued.clear();
      if(user?.id)setCloudList(user.id,[]).catch(()=>{});
      window.dispatchEvent(new CustomEvent(EVT));return true;
    }catch{return false;}
  },[user?.id,records]);

  return {
    cachedIds: cachedIds || new Set(),
    records,
    downloading,
    loading: cachedIds === null,
    refresh,
    isCached: (id) => (cachedIds ? cachedIds.has(id) : false),
    downloadTrack,
    saveForOffline:downloadTrack,
    removeTrack,
    reorder,
    clearAllCache,
  };
}