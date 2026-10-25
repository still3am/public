import {markArtistReleasesRead} from '@/lib/artistReleaseRead';
import {useCallback,useEffect,useState,useRef} from "react";
import {useAuth} from "@/lib/AuthContext";
import {base44} from "@/api/base44Client";
import {readAllPages} from "@/lib/readPages";
import {getPublishedTracks} from "@/lib/catalogCache";
import {releaseNotifications} from "@/lib/artistReleaseModel";
const cache=new Map();
async function load(uid){
 let entry=cache.get(uid);if(entry&&Date.now()-entry.time<45000)return entry.promise;
 const promise=Promise.all([readAllPages(opts=>base44.entities.ArtistSubscription.filter({created_by_id:uid},{...opts})),getPublishedTracks()]).then(([s,t])=>releaseNotifications(s,t));
 entry={time:Date.now(),promise};cache.set(uid,entry);try{return await promise;}catch(e){if(cache.get(uid)===entry)cache.delete(uid);throw e;}
}
export function useArtistReleases(){
 const {user}=useAuth(),[state,setState]=useState({uid:null,items:[]}),[error,setError]=useState(false),[version,setVersion]=useState(0);
 const account=useRef(user?.id),readVersion=useRef(0);account.current=user?.id;
 const refresh=useCallback(()=>{readVersion.current++;cache.delete(user?.id);setVersion(n=>n+1);},[user?.id]);
 useEffect(()=>{
  setError(false);if(!user?.id)return;let alive=true;
  const read=()=>{if(document.visibilityState==="hidden")return;const request=++readVersion.current;load(user.id).then(items=>{if(alive&&request===readVersion.current&&account.current===user.id){setState({uid:user.id,items});setError(false);}}).catch(()=>{if(alive&&request===readVersion.current)setError(true);});};
  read();const timer=setInterval(read,60000);
  for(const event of ["artist-follows:changed","notifications:changed","catalog:invalidate"])window.addEventListener(event,refresh);
  window.addEventListener("focus",read);
  return()=>{alive=false;readVersion.current++;clearInterval(timer);for(const event of ["artist-follows:changed","notifications:changed","catalog:invalidate"])window.removeEventListener(event,refresh);window.removeEventListener("focus",read);};
 },[user?.id,version,refresh]);
 const items=state.uid===user?.id?state.items:[];
 async function markRead(id){
  const uid=user?.id;if(!uid||account.current!==uid)return;
  const targets=id?items.filter(n=>n.id===id&&!n.read):items.filter(n=>!n.read);if(!targets.length)return;
  readVersion.current++;
  try{
   await markArtistReleasesRead(base44,uid,targets);
   if(account.current!==uid)return;
   const ids=new Set(targets.map(n=>n.id));setState(s=>s.uid===uid?{...s,items:s.items.map(n=>ids.has(n.id)?{...n,read:true}:n)}:s);
  }finally{cache.delete(uid);if(account.current===uid)window.dispatchEvent(new Event("notifications:changed"));}
 }
 return {items,error,refresh,markRead,unread:items.filter(n=>!n.read).length};
}
for(const event of ["account:cleared","catalog:invalidate"])window.addEventListener(event,()=>cache.clear());
