import {useEffect,useRef,useState} from "react";
import {Bell,BellRing} from "lucide-react";
import {base44} from "@/api/base44Client";
import {useAuth} from "@/lib/AuthContext";
import {artistKey} from "@/lib/artistReleaseModel";
import {useToast} from "@/components/ui/use-toast";
export default function ArtistReleaseFollow({name}){
 const {user}=useAuth(),{toast}=useToast(),[followed,setFollowed]=useState(false),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),lock=useRef(false),key=artistKey(name);
 useEffect(()=>{let alive=true;setReady(false);setFollowed(false);if(!user?.id)return;const read=()=>base44.entities.ArtistSubscription.filter({artist_key:key},"-created_date",1).then(p=>{if(alive){setFollowed((Array.isArray(p)?p:p?.items||[]).length>0);setReady(true);}}).catch(()=>{if(alive)setReady(false);});read();window.addEventListener("artist-follows:changed",read);return()=>{alive=false;window.removeEventListener("artist-follows:changed",read);};},[user?.id,key]);
 async function toggle(){
  if(!user){window.location.assign("/login?returnTo="+encodeURIComponent(window.location.pathname+window.location.search));return;}
  if(lock.current)return;lock.current=true;setBusy(true);
  try{if(followed)await base44.entities.ArtistSubscription.deleteMany({artist_key:key,created_by_id:user.id});else await base44.entities.ArtistSubscription.create({artist_name:name,artist_key:key,read_track_ids:[]});setFollowed(!followed);window.dispatchEvent(new Event("artist-follows:changed"));}
  catch{toast({title:"Release notifications couldn’t save. Please retry.",variant:"destructive"});}
  finally{lock.current=false;setBusy(false);}
 }
 return <button type="button" disabled={busy||!!user&&!ready} onClick={toggle} aria-pressed={followed} className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/15 text-white px-4 min-h-11 text-xs font-semibold mt-3 disabled:opacity-50">{followed?<BellRing size={15}/>:<Bell size={15}/>} {followed?"Following releases":"Follow releases"}</button>;
}
