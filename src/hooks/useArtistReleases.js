import {useCallback,useEffect,useState} from "react";
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
 const refresh=useCallback(()=>{cache.delete(user?.id);setVersion(n=>n+1);},[user?.id]);
 useEffect(()=>{if(!user?.id)return;let alive=true;const read=()=>{if(document.visibilityState==="hidden")return;load(user.id).then(items=>{if(alive){setState({uid:user.id,items});setError(false);}}).catch(()=>{if(alive)setError(true);});};read();const timer=setInterval(read,60000);window.addEventListener("artist-follows:changed",refresh);window.addEventListener("notifications:changed",refresh);window.addEventListener("focus",read);return()=>{alive=false;clearInterval(timer);window.removeEventListener("artist-follows:changed",refresh);window.removeEventListener("notifications:changed",refresh);window.removeEventListener("focus",read);};},[user?.id,version,refresh]);
 const items=state.uid===user?.id?state.items:[];
 async function markRead(id){
  const targets=id?items.filter(n=>n.id===id):items.filter(n=>!n.read);
  for(const n of targets)await base44.entities.ArtistSubscription.updateMany({id:n.subscription_id,created_by_id:user.id},{$addToSet:{read_track_ids:n.track_id}});
  const ids=new Set(targets.map(n=>n.id));setState(s=>({...s,items:s.items.map(n=>ids.has(n.id)?{...n,read:true}:n)}));cache.delete(user.id);window.dispatchEvent(new Event("notifications:changed"));
 }
 return {items,error,refresh,markRead,unread:items.filter(n=>!n.read).length};
}
window.addEventListener("account:cleared",()=>cache.clear());
