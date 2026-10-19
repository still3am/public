import {useEffect,useRef,useState} from "react";
import {Star,Loader2} from "lucide-react";
import {base44} from "@/api/base44Client";
import {useAuth} from "@/lib/AuthContext";
import {artistKey} from "@/lib/artistReleaseModel";
import {useToast} from "@/components/ui/use-toast";
import './artist-release-star.css';
export default function ArtistReleaseFollow({name,variant="icon"}){
 const {user}=useAuth(),{toast}=useToast(),[followed,setFollowed]=useState(false),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(false),lock=useRef(false),alive=useRef(true),readVersion=useRef(0),key=artistKey(name);
 async function read(){
  const version=++readVersion.current;
  setError(false);setReady(false);
  try{
   const page=await base44.entities.ArtistSubscription.filter({artist_key:key,created_by_id:user.id},"-created_date",1);
   if(alive.current&&version===readVersion.current){setFollowed((Array.isArray(page)?page:page?.items||[]).length>0);setReady(true);}
  }catch{if(alive.current&&version===readVersion.current){setError(true);setReady(true);}}
 }
 useEffect(()=>{
  alive.current=true;setFollowed(false);setReady(!user?.id);
  if(user?.id)read();
  const refresh=()=>{if(user?.id&&!lock.current)read();};
  window.addEventListener("artist-follows:changed",refresh);
  window.addEventListener("focus",refresh);
  return()=>{alive.current=false;readVersion.current++;window.removeEventListener("artist-follows:changed",refresh);window.removeEventListener("focus",refresh);};
 },[user?.id,key]);
 async function toggle(){
  if(!user){window.location.assign("/login?returnTo="+encodeURIComponent(window.location.pathname+window.location.search));return;}
  if(error){read();return;}
  if(lock.current||!ready)return;lock.current=true;setBusy(true);
  try{
   if(followed)await base44.entities.ArtistSubscription.deleteMany({artist_key:key,created_by_id:user.id});
   else {const saved=await base44.entities.ArtistSubscription.create({artist_name:name,artist_key:key,read_track_ids:[]});if(!saved?.id)throw Error("Subscription not confirmed");}
   if(alive.current){setFollowed(!followed);toast({title:followed?"Artist notifications turned off":"Artist notifications turned on",description:followed?name+" release alerts are off.":"New "+name+" releases will appear in your PUBLIC notifications."});}
   window.dispatchEvent(new Event("artist-follows:changed"));
  }catch{if(alive.current)toast({title:"Release notifications couldn’t save. Please retry.",variant:"destructive"});}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 const label=error?"Retry notification setting for "+name:(followed?"Turn off":"Turn on")+" release notifications for "+name;
 const menu=variant==="menu",loading=busy||!!user&&!ready;
 return <button type="button" disabled={loading} onClick={toggle} role={menu?"menuitemcheckbox":undefined} aria-checked={menu?followed:undefined} aria-pressed={menu?undefined:followed} aria-label={label} title={label} className={menu?"artist-notification-menu-row w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-popover-foreground hover:bg-accent focus-visible:bg-accent disabled:opacity-60":"artist-release-star"}>
  {loading?<Loader2 size={menu?18:21} className="animate-spin shrink-0"/>:<Star size={menu?18:23} className="shrink-0" fill={followed?"currentColor":"none"} strokeWidth={1.8}/>}
  {menu&&<span className="min-w-0 flex-1">{error?"Retry notifications":followed?"Notifications on":"Notify me"} · {name}</span>}
 </button>;
}

