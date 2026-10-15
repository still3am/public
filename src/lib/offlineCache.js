// Per-account IndexedDB audio. Signing out disconnects the active account;
// only explicit removal/account deletion erases its downloaded files.
const LEGACY_DB="public_offline",STORE="tracks",META_STORE="meta";
const connections=new Map();
let activeAccount=null,persistenceRequest=null;
export const getOfflineAccount=()=>activeAccount;
export function setOfflineAccount(userId){
 const next=userId||null;if(next===activeAccount)return;
 activeAccount=next;
 if(typeof window!=="undefined")window.dispatchEvent(new Event("offlinecache:account"));
}
export function rememberLegacyOfflineOwner(userId){
 if(!userId)return;
 try{if(!localStorage.getItem("public:offline:legacy-owner"))localStorage.setItem("public:offline:legacy-owner",userId);}catch{}
}
export function requestPersistentStorage(){
 if(persistenceRequest)return persistenceRequest;
 let request;
 request=(async()=>{try{const storage=typeof navigator!=="undefined"?navigator.storage:null;if(!storage)return false;if(await storage.persisted?.())return true;return storage.persist?await storage.persist():false;}catch{return false;}})().then(granted=>{if(!granted&&persistenceRequest===request)persistenceRequest=null;return granted;});
 persistenceRequest=request;return request;
}
function openNamed(name){
 if(connections.has(name))return connections.get(name);
 let attempt;
 attempt=new Promise((resolve,reject)=>{
  if(typeof indexedDB==="undefined"){reject(Error("Offline storage is unavailable"));return;}
  const req=indexedDB.open(name,2);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});if(!db.objectStoreNames.contains(META_STORE))db.createObjectStore(META_STORE,{keyPath:"key"});};
  req.onsuccess=()=>{const db=req.result;const reset=()=>{if(connections.get(name)===attempt)connections.delete(name);};db.onversionchange=()=>{db.close();reset();};db.onclose=reset;resolve(db);};
  req.onerror=()=>reject(req.error||Error("Offline storage could not open"));
  req.onblocked=()=>reject(Error("Close other PUBLIC tabs and retry offline storage"));
 }).catch(error=>{if(connections.get(name)===attempt)connections.delete(name);throw error;});
 connections.set(name,attempt);return attempt;
}
function openDB(userId=activeAccount){
 if(!userId)return Promise.reject(Error("Sign in to access offline music"));
 return openNamed("public_offline_account_"+encodeURIComponent(userId));
}
const done=transaction=>new Promise((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onabort=()=>reject(transaction.error||Error("Offline storage write failed"));transaction.onerror=()=>reject(transaction.error||Error("Offline storage write failed"));});
const result=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error("Offline storage read failed"));});
async function read(store,key,userId){const db=await openDB(userId);return result(db.transaction(store,"readonly").objectStore(store).get(key));}
async function write(store,operation,userId){const db=await openDB(userId),transaction=db.transaction(store,"readwrite"),finished=done(transaction);operation(transaction.objectStore(store));await finished;}
export async function putTrack(track,blob,coverBlob,userId=activeAccount){
 if(!blob?.size)throw Error("Audio download was empty");
 await write(STORE,store=>store.put({id:track.id,title:track.title||"Unknown",artist:track.artist||track.uploader_name||"",uploader_id:track.uploader_id||"",uploader_name:track.uploader_name||"",cover_art_url:track.cover_art_url||"",audio_url:track.audio_url||"",_private_audio:!!track._private_audio,duration_seconds:track.duration_seconds||0,genre:track.genre||"",explicit:!!track.explicit,_blob:blob,_coverBlob:coverBlob||null,_size:blob.size,_savedAt:Date.now()}),userId);
}
export async function putCoverArt(id,coverBlob,userId=activeAccount){
 const db=await openDB(userId),transaction=db.transaction(STORE,"readwrite"),finished=done(transaction),store=transaction.objectStore(STORE),request=store.get(id);
 request.onsuccess=()=>{if(request.result)store.put({...request.result,_coverBlob:coverBlob});};
 await finished;
}
export async function getRecord(id,userId=activeAccount){
 if(!userId)return null;
 try{return await read(STORE,id,userId)||null;}catch{return null;}
}
export async function listRecords(userId=activeAccount){
 if(!userId)return [];
 const db=await openDB(userId);return await result(db.transaction(STORE,"readonly").objectStore(STORE).getAll())||[];
}
export async function deleteRecord(id,userId=activeAccount){await write(STORE,store=>store.delete(id),userId);}
export async function clearAll(userId=activeAccount){await write(STORE,store=>store.clear(),userId);}
export async function getOrderIds(userId=activeAccount){if(!userId)return null;return (await read(META_STORE,"order",userId))?.ids||null;}
export async function setOrderIds(ids,userId=activeAccount){await write(META_STORE,store=>store.put({key:"order",ids:[...new Set(ids)]}),userId);}
export async function clearMeta(userId=activeAccount){await write(META_STORE,store=>store.clear(),userId);}

let migrationJob=null;
// The old unscoped cache is adopted only when the previous signed-in account
// proves its owner. Never assign unknown downloads to whichever person logs in.
export async function migrateLegacyOffline(userId,previousUserId){
 rememberLegacyOfflineOwner(previousUserId);
 let owner;try{owner=localStorage.getItem("public:offline:legacy-owner");}catch{return;}
 if(!userId||owner!==userId)return;
 if(migrationJob)return migrationJob;
 migrationJob=(async()=>{
  if(indexedDB.databases){const databases=await indexedDB.databases();if(!databases.some(db=>db.name===LEGACY_DB))return;}
  const old=await openNamed(LEGACY_DB);
  const records=await result(old.transaction(STORE,"readonly").objectStore(STORE).getAll());
  if(!records.length)return;
  const order=await result(old.transaction(META_STORE,"readonly").objectStore(META_STORE).get("order"));
  const db=await openDB(userId),transaction=db.transaction([STORE,META_STORE],"readwrite"),finished=done(transaction),store=transaction.objectStore(STORE);
  for(const record of records){const read=store.get(record.id);read.onsuccess=()=>{if(!read.result)store.put(record);};}
  if(order){const meta=transaction.objectStore(META_STORE),read=meta.get("order");read.onsuccess=()=>{if(!read.result)meta.put(order);};}
  await finished;
  const cleanup=old.transaction([STORE,META_STORE],"readwrite"),cleaned=done(cleanup);cleanup.objectStore(STORE).clear();cleanup.objectStore(META_STORE).clear();await cleaned;
 })().finally(()=>{migrationJob=null;});
 return migrationJob;
}
