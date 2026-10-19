import {useEffect,useState} from "react";
import {base44} from "@/api/base44Client";
import {searchPeople} from "@/lib/globalSearch";
import {getUsersByIds} from "@/lib/userLookup";
import {useAuth} from "@/lib/AuthContext";
import {Users,Plus,X,Loader2} from "lucide-react";
import {useToast} from "@/components/ui/use-toast";
export default function PlaylistCollaborators({playlist,onSaved}){
 const {user}=useAuth(),{toast}=useToast(),owner=playlist.creator_id===user?.id;
 const [open,setOpen]=useState(false),[query,setQuery]=useState(""),[results,setResults]=useState([]),[members,setMembers]=useState([]),[busy,setBusy]=useState(false),[searching,setSearching]=useState(false),[failed,setFailed]=useState(false);
 const ids=JSON.stringify(playlist.collaborator_ids||[]);
 useEffect(()=>{let alive=true;getUsersByIds(JSON.parse(ids)).then(rows=>{if(alive)setMembers(rows);}).catch(()=>{});return()=>{alive=false;};},[ids]);
 useEffect(()=>{let alive=true;setResults([]);setFailed(false);if(query.trim().length<2){setSearching(false);return;}setSearching(true);const timer=setTimeout(()=>searchPeople(query).then(r=>{if(alive)setResults(r.data.results||[]);}).catch(()=>{if(alive)setFailed(true);}).finally(()=>{if(alive)setSearching(false);}),300);return()=>{alive=false;clearTimeout(timer);};},[query]);
 async function change(id,add){
  if(busy)return;setBusy(true);
  try{const r=await base44.functions.invoke("securityGateway",{entity:"Playlist",action:"collaborators",args:[playlist.id,id,add]});if(!r.data?.result)throw Error("Invitation was not saved");onSaved(r.data.result);window.dispatchEvent(new Event("playlists:changed"));setQuery("");}
  catch(e){toast({title:e.response?.data?.error||"Couldn’t update collaborators. Please retry.",variant:"destructive"});}
  finally{setBusy(false);}
 }
 return <section className="my-5">
  <div className="flex items-center gap-3 flex-wrap">{owner?<button type="button" className="playlist-action" onClick={()=>setOpen(v=>!v)} aria-expanded={open}><Users size={17}/>{playlist.collaboration_enabled?"Manage collaborators":"Invite collaborators"}</button>:playlist.collaboration_enabled?<p className="text-sm text-muted-foreground flex gap-2 items-center"><Users size={16}/>Collaborative playlist</p>:null}
  {(playlist.collaborator_ids||[]).length>0&&<span className="text-xs text-muted-foreground">{playlist.collaborator_ids.length} collaborators</span>}</div>
  {open&&owner&&<div className="mt-3 border rounded-2xl p-4 space-y-3 bg-card"><p className="text-sm text-muted-foreground">Invited listeners can add, remove and reorder songs. Only you can change the playlist details or invite others.</p>
   {members.map(m=><div key={m.id} className="flex items-center gap-3"><span className="flex-1 text-sm">{m.display_name||m.full_name||"Listener"}</span><button type="button" disabled={busy} onClick={()=>change(m.id,false)} aria-label={"Remove "+(m.display_name||"collaborator")} className="w-11 h-11 grid place-items-center rounded-full hover:bg-foreground/5"><X size={16}/></button></div>)}
   <input className="w-full border bg-background rounded-xl px-3 py-3 text-sm" placeholder="Find a listener by name" aria-label="Search for collaborators" value={query} onChange={e=>setQuery(e.target.value)}/>
   {searching&&query.trim().length>=2&&<Loader2 size={16} className="animate-spin"/>}{failed&&<p role="status" className="text-sm">Search couldn’t load. Try again.</p>}
   {results.filter(m=>m.id!==playlist.creator_id&&!(playlist.collaborator_ids||[]).includes(m.id)).map(m=><button key={m.id} type="button" disabled={busy} onClick={()=>change(m.id,true)} className="w-full flex justify-between items-center py-3 text-sm"><span>{m.display_name||m.username||"Listener"}</span><Plus size={17}/></button>)}
  </div>}
 </section>;
}
