import {useCallback,useEffect,useRef,useState} from "react";
import {requestPersistentStorage,putTrack,getRecord,putCoverArt,listRecords,deleteRecord,clearAll,getOrderIds,setOrderIds,clearMeta,getOfflineAccount} from "@/lib/offlineCache";
import {base44} from "@/api/base44Client";
import {useAuth} from "@/lib/AuthContext";
import {getCloudList,addCloudTrack,addCloudTracks} from "@/lib/offlineSync";

const EVT="offlinecache:change",STATUS="offlinecache:downloads";
const jobs=new Map(),autoQueued=new Set(),retryAfter=new Map(),removals=new Map(),cloudJobs=new Map(),storageReads=new Map(),cloudKnown=new Map();
const downloadPause=new Map();
let generation=0;
const emit=event=>window.dispatchEvent(new Event(event));
const invalidate=()=>{generation++;jobs.clear();autoQueued.clear();retryAfter.clear();downloadPause.clear();removals.clear();cloudJobs.clear();cloudKnown.clear();storageReads.clear();emit(STATUS);};
// Track menus share one pending device read instead of loading every audio
// blob again for each song card mounted on the page.
window.addEventListener(EVT,()=>storageReads.clear());
function readDevice(uid){
 if(storageReads.has(uid))return storageReads.get(uid);
 let job;job=Promise.all([listRecords(uid),getOrderIds(uid)]).finally(()=>{if(storageReads.get(uid)===job)storageReads.delete(uid);});
 storageReads.set(uid,job);return job;
}
window.addEventListener("account:cleared",invalidate);
window.addEventListener("offlinecache:account",invalidate);
const suppressedFor=uid=>{try{return new Set(JSON.parse(localStorage.getItem("public:offline:suppressed:"+uid)||"[]"));}catch{return new Set();}};
function suppress(uid,ids,remove=false){if(!uid)return;try{const set=suppressedFor(uid);ids.forEach(id=>remove?set.delete(id):set.add(id));localStorage.setItem("public:offline:suppressed:"+uid,JSON.stringify([...set]));}catch{}}
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


export function useOfflineCache(){
 const {user}=useAuth(),uid=user?.id,account=useRef(uid);account.current=uid;
 const [cachedIds,setCachedIds]=useState(null),[records,setRecords]=useState([]),[storageAvailable,setStorageAvailable]=useState(null),[downloading,setDownloading]=useState({}),[syncing,setSyncing]=useState(false);
 const recordsRef=useRef(records);recordsRef.current=records;
 const [syncState,setSyncState]=useState({uid:null,error:false,pending:0});
 const refreshVersion=useRef(0),loadedFor=useRef(null),backfilled=useRef(new Set());
 const active=useCallback(()=>!!uid&&account.current===uid&&getOfflineAccount()===uid,[uid]);
 const applyOrder=useCallback((all,ids)=>{
  if(!ids?.length)return [...all].sort((a,b)=>(b._savedAt||0)-(a._savedAt||0));
  const byId=new Map(all.map(r=>[r.id,r])),chosen=new Set(ids);
  return [...all.filter(r=>!chosen.has(r.id)).sort((a,b)=>(b._savedAt||0)-(a._savedAt||0)),...ids.map(id=>byId.get(id)).filter(Boolean)];
 },[]);
 const refresh=useCallback(async()=>{
  const request=++refreshVersion.current,started=generation;
  if(!active()){loadedFor.current=null;setRecords([]);setCachedIds(new Set());setStorageAvailable(null);return;}
  try{
   const [rows,order]=await readDevice(uid);
   if(request!==refreshVersion.current||started!==generation||!active())return;
   const all=rows.filter(r=>r._blob?.size>0);
   loadedFor.current=uid;setStorageAvailable(true);setRecords(applyOrder(all,order));
   const next=new Set(all.map(r=>r.id));
   setCachedIds(previous=>previous&&previous.size===next.size&&[...next].every(id=>previous.has(id))?previous:next);
   if(navigator.onLine){
    const need=all.filter(r=>r.cover_art_url&&!backfilled.current.has(r.id)&&!r._coverBlob?.type?.startsWith("image/"));
    if(need.length)(async()=>{let changed=false;for(const row of need){
     if(started!==generation||!active())return;
     backfilled.current.add(row.id);
     try{const response=await fetch(row.cover_art_url,{signal:AbortSignal.timeout(10000)});if(response.ok){const blob=await toImageBlob(response);if(started!==generation||!active())return;await putCoverArt(row.id,blob,uid);changed=true;}}catch{}
    }if(changed)emit(EVT);})();
   }
  }catch{if(request===refreshVersion.current&&started===generation&&active()){setStorageAvailable(false);setCachedIds(previous=>previous||new Set());}}
 },[uid,active,applyOrder]);
 useEffect(()=>{loadedFor.current=null;backfilled.current.clear();setRecords([]);setCachedIds(null);setDownloading({});refresh();return()=>{refreshVersion.current++;};},[refresh]);
 useEffect(()=>{
  const status=()=>{const next={};for(const job of jobs.values())if(job.uid===uid)next[job.id]=true;setDownloading(next);setSyncing(cloudJobs.has(uid));};
  const changed=()=>{status();refresh();};
  window.addEventListener(EVT,changed);window.addEventListener(STATUS,status);window.addEventListener("offlinecache:account",changed);status();
  return()=>{window.removeEventListener(EVT,changed);window.removeEventListener(STATUS,status);window.removeEventListener("offlinecache:account",changed);};
 },[uid,refresh]);

 const downloadTrack=useCallback(async(track,{automatic=false}={})=>{
  if(!active()||!track?.id)return false;
  const id=track.id,key=uid+":"+id;
  if(jobs.has(key))return false;
  const job={uid,id},started=generation,removed=removals.get(key)||0;jobs.set(key,job);retryAfter.delete(key);emit(STATUS);
  const valid=()=>active()&&started===generation&&removed===(removals.get(key)||0)&&(!automatic||!suppressedFor(uid).has(id));
  try{
   const existing=await getRecord(id,uid);
   if(!valid())return false;
   if(existing?._blob?.size){if(!automatic)suppress(uid,[id],true);return true;}
   if(!automatic)requestPersistentStorage();
   const authorized=await base44.entities.Track.get(id);
   if(!valid()||authorized?.id!==id||!authorized.audio_url)return false;
   track=authorized;
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
   let blob;
   try{const response=await fetch(track.audio_url,{signal:controller.signal});if(!response.ok)throw Error("Audio download failed");blob=await response.blob();if(!blob.size||/text\/html|application\/json/.test(blob.type))throw Error("Invalid audio download");}finally{clearTimeout(timer);}
   let cover=null;
   try{if(track.cover_art_url){const response=await fetch(track.cover_art_url,{signal:AbortSignal.timeout(10000)});if(response.ok)cover=await toImageBlob(response);}}catch{}
   if(!valid())return false;
   await putTrack(track,blob,cover,uid);
   if(!valid()){await deleteRecord(id,uid);return false;}
   const saved=await getRecord(id,uid);if(!saved?._blob?.size)throw Error("Audio did not persist");
   const order=await getOrderIds(uid).catch(()=>[]);if(!valid())return false;
   await setOrderIds([id,...(order||[]).filter(value=>value!==id)],uid).catch(()=>{});
   if(!automatic)suppress(uid,[id],true);
   if(valid()&&!automatic)addCloudTrack(uid,track).catch(()=>{if(valid())setSyncState(state=>({...state,uid,error:true}));});
   emit(EVT);return true;
  }catch(error){if((error?.status??error?.response?.status)===402)downloadPause.set(uid,Date.now()+60000);return false;}
  finally{if(jobs.get(key)===job){jobs.delete(key);emit(STATUS);}}
 },[uid,active]);

 const syncFromCloud=useCallback(async()=>{
  if(!active()||loadedFor.current!==uid||!cachedIds||cloudJobs.has(uid)||!navigator.onLine)return;
  const token=Symbol(uid),started=generation;cloudJobs.set(uid,token);emit(STATUS);
  try{
   let cloud=await getCloudList(uid);if(started!==generation||!active())return;
   const known=new Set(cloud.map(track=>track?.id).filter(Boolean));
   const local=recordsRef.current.filter(row=>row._blob?.size&&!known.has(row.id)&&!suppressedFor(uid).has(row.id));
   if(local.length){cloud=await addCloudTracks(uid,local);if(started!==generation||!active())return;}
   cloudKnown.set(uid,new Set(cloud.map(track=>track?.id).filter(Boolean)));
   setSyncState({uid,error:false,pending:cloud.filter(row=>!cachedIds.has(row.id)&&!suppressedFor(uid).has(row.id)).length});
   let cursor=0;
   const worker=async()=>{while(cursor<cloud.length){
    if(started!==generation||!active()||(downloadPause.get(uid)||0)>Date.now())return;
    const track=cloud[cursor++],id=track?.id,key=uid+":"+id;
    if(!id||cachedIds.has(id)||autoQueued.has(key)||suppressedFor(uid).has(id)||(retryAfter.get(key)||0)>Date.now())continue;
    autoQueued.add(key);
    try{const saved=await getRecord(id,uid);if(started!==generation||!active())return;if(saved?._blob?.size)continue;
     if(!await downloadTrack(track,{automatic:true})&&started===generation)retryAfter.set(key,Date.now()+60000);
    }finally{if(started===generation)autoQueued.delete(key);}
   }};
   await Promise.all([worker(),worker()]);
   if(started!==generation||!active())return;
   const [device]=await readDevice(uid);
   if(started!==generation||!active())return;
   const saved=new Set(device.filter(row=>row._blob?.size).map(row=>row.id));
   setSyncState({uid,error:false,pending:cloud.filter(row=>!saved.has(row.id)&&!suppressedFor(uid).has(row.id)).length});
  }catch{if(started===generation&&active())setSyncState(state=>({...state,uid,error:true}));/* Keep this device's files. */}
  finally{if(cloudJobs.get(uid)===token){cloudJobs.delete(uid);emit(STATUS);}}
 },[uid,active,cachedIds,downloadTrack]);
 useEffect(()=>{syncFromCloud();},[syncFromCloud]);
 useEffect(()=>{
  const recover=()=>{if(document.visibilityState!=="hidden"){refresh();syncFromCloud();}};
  window.addEventListener("online",recover);window.addEventListener("focus",recover);document.addEventListener("visibilitychange",recover);
  return()=>{window.removeEventListener("online",recover);window.removeEventListener("focus",recover);document.removeEventListener("visibilitychange",recover);};
 },[refresh,syncFromCloud]);

 const removeTrack=useCallback(async id=>{
  if(!active())return false;
  const key=uid+":"+id;removals.set(key,(removals.get(key)||0)+1);
  try{await deleteRecord(id,uid);suppress(uid,[id]);const order=await getOrderIds(uid).catch(()=>null);if(order)await setOrderIds(order.filter(value=>value!==id),uid).catch(()=>{});emit(EVT);return true;}catch{return false;}
 },[uid,active]);
 const reorder=useCallback(async ids=>{
  if(!active())return false;
  setRecords(previous=>applyOrder(previous,ids));
  try{await setOrderIds(ids,uid);emit(EVT);return true;}catch{await refresh();return false;}
 },[uid,active,applyOrder,refresh]);
 const clearAllCache=useCallback(async()=>{
  if(!active())return false;
  const ids=[...new Set([...records.map(row=>row.id),...(cloudKnown.get(uid)||[]),...[...jobs.values()].filter(job=>job.uid===uid).map(job=>job.id)])];
  generation++;jobs.clear();autoQueued.clear();retryAfter.clear();cloudJobs.clear();emit(STATUS);
  try{await clearAll(uid);suppress(uid,ids);await clearMeta(uid).catch(()=>{});emit(EVT);return true;}catch{return false;}
 },[uid,active,records]);
 const visible=active()&&loadedFor.current===uid;
 return {cachedIds:visible&&cachedIds?cachedIds:new Set(),records:visible?records:[],storageAvailable,downloading:active()?downloading:{},syncing:active()&&syncing,syncError:active()&&syncState.uid===uid&&syncState.error,pendingCount:active()&&syncState.uid===uid?syncState.pending:0,loading:active()&&cachedIds===null,refresh,syncFromCloud,isCached:id=>visible&&!!cachedIds?.has(id),downloadTrack,saveForOffline:downloadTrack,removeTrack,reorder,clearAllCache};
}
