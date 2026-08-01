// IndexedDB-backed offline audio cache for PUBLIC.

const DB_NAME = "public_offline";
const STORE = "tracks";
const META_STORE = "meta";
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function txMeta(mode) {
  return openDB().then((db) => db.transaction(META_STORE, mode).objectStore(META_STORE));
}

function tx(mode) {
  return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

export async function putTrack(track, blob, coverBlob) {
  const store = await tx("readwrite");
  const record = {
    id: track.id,
    title: track.title || "Unknown",
    artist: track.artist || track.uploader_name || "",
    uploader_id: track.uploader_id || "",
    uploader_name: track.uploader_name || "",
    cover_art_url: track.cover_art_url || "",
    audio_url: track.audio_url || "",
    duration_seconds: track.duration_seconds || 0,
    genre: track.genre || "",
    explicit: !!track.explicit,
    _blob: blob,
    _coverBlob: coverBlob || null,
    _size: blob.size,
    _savedAt: Date.now(),
  };
  return new Promise((res, rej) => {
    const r = store.put(record);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

// Backfill cover art for a record that was saved before offline-cover caching.
export async function putCoverArt(id, coverBlob) {
  const store = await tx("readwrite");
  return new Promise((res, rej) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const rec = req.result;
      if (!rec) return res();
      rec._coverBlob = coverBlob;
      const pr = store.put(rec);
      pr.onsuccess = () => res();
      pr.onerror = () => rej(pr.error);
    };
    req.onerror = () => rej(req.error);
  });
}

export async function getRecord(id) {
  try {
    const store = await tx("readonly");
    return await new Promise((res, rej) => {
      const r = store.get(id);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    });
  } catch {
    return null;
  }
}

export async function listRecords() {
  const store = await tx("readonly");
  return new Promise((res, rej) => {
    const r = store.getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}

export async function deleteRecord(id) {
  const store = await tx("readwrite");
  return new Promise((res, rej) => {
    const r = store.delete(id);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

export async function clearAll() {
  const store = await tx("readwrite");
  return new Promise((res, rej) => {
    const r = store.clear();
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

// --- custom download ordering (persists across sessions) ---
export async function getOrderIds() {
  try {
    const store = await txMeta("readonly");
    return await new Promise((res, rej) => {
      const r = store.get("order");
      r.onsuccess = () => res(r.result?.ids || null);
      r.onerror = () => rej(r.error);
    });
  } catch {
    return null;
  }
}

export async function setOrderIds(ids) {
  const store = await txMeta("readwrite");
  return new Promise((res, rej) => {
    const r = store.put({ key: "order", ids });
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

export async function clearMeta() {
  try {
    const store = await txMeta("readwrite");
    return new Promise((res, rej) => {
      const r = store.clear();
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  } catch {
    /* ignore */
  }
}