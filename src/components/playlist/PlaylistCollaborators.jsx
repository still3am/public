import {useEffect,useState,useRef} from "react";
import {playlistDatabase} from "@/api/base44Client";
import {savePlaylistInvitation} from "@/lib/playlistInvitations";
import Avatar from "@/components/Avatar";
import {searchPeople} from "@/lib/globalSearch";
import {getUsersByIds} from "@/lib/userLookup";
import {useAuth} from "@/lib/AuthContext";
import {Plus,X,Loader2} from "lucide-react";
import {useToast} from "@/components/ui/use-toast";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
export default function PlaylistCollaborators({playlist,onSaved,onClose}){
 const {user}=useAuth(),{toast}=useToast(),owner=playlist.creator_id===user?.id;
 const [query,setQuery]=useState(""),[results,setResults]=useState([]),[members,setMembers]=useState([]),[busy,setBusy]=useState(false),[searching,setSearching]=useState(false),[failed,setFailed]=useState(false);
 const lock=useRef(false),live=useRef(true),identity=useRef("");identity.current=playlist.id+":"+user?.id;
 const [saveError,setSaveError]=useState("");
 const ids=JSON.stringify(playlist.collaborator_ids||[]);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{setQuery("");setMembers([]);setSaveError("");setBusy(false);},[playlist.id,user?.id]);
 useEffect(()=>{let alive=true;getUsersByIds(JSON.parse(ids)).then(rows=>{if(alive)setMembers(rows);}).catch(()=>{});return()=>{alive=false;};},[ids]);
 useEffect(()=>{let alive=true;setResults([]);setFailed(false);if(query.trim().length<2){setSearching(false);return;}setSearching(true);const timer=setTimeout(()=>searchPeople(query).then(r=>{if(alive)setResults(r.data.results||[]);}).catch(()=>{if(alive)setFailed(true);}).finally(()=>{if(alive)setSearching(false);}),300);return()=>{alive=false;clearTimeout(timer);};},[query]);
 async function change(id,add){
  if(lock.current||!owner)return;lock.current=true;setBusy(true);setSaveError("");const key=identity.current;
  try{const saved=await savePlaylistInvitation(playlistDatabase,playlist.id,id,add);if(!live.current||identity.current!==key)return;onSaved({...playlist,...saved});window.dispatchEvent(new Event("playlists:changed"));setQuery("");toast({title:add?"Collaborator added":"Collaborator removed"});}
  catch(e){if(live.current&&identity.current===key)setSaveError(e.response?.data?.error||e.message||"Couldn’t update collaborators. Please retry.");}
  finally{lock.current=false;if(live.current&&identity.current===key)setBusy(false);}
 }
 if(!owner)return null;
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose?.();}}><DialogContent className="playlist-collaborators-dialog">
  <DialogHeader><DialogTitle>Collaborators</DialogTitle><DialogDescription>Choose who can add, remove, and reorder songs in {playlist.name}.</DialogDescription></DialogHeader>
  <div className="playlist-collaborator-panel space-y-3"><p className="text-sm text-muted-foreground">Invited listeners can add, remove and reorder songs. Only you can change the playlist details or invite others.</p>
   {saveError&&<p className="playlist-collaborator-error" role="alert">{saveError}</p>}
   {members.map(m=><div key={m.id} className="flex items-center gap-3"><Avatar user={m} size={32}/><span className="flex-1 text-sm">{m.display_name||m.full_name||"Listener"}</span><button type="button" disabled={busy} onClick={()=>change(m.id,false)} aria-label={"Remove "+(m.display_name||"collaborator")} className="w-11 h-11 grid place-items-center rounded-full hover:bg-foreground/5"><X size={16}/></button></div>)}
   <input className="w-full border bg-background rounded-xl px-3 py-3 text-sm" placeholder="Find a listener by name" aria-label="Search for collaborators" value={query} onChange={e=>setQuery(e.target.value)}/>
   {searching&&query.trim().length>=2&&<Loader2 size={16} className="animate-spin"/>}{failed&&<p role="status" className="text-sm">Search couldn’t load. Try again.</p>}
   {results.filter(m=>m.id!==playlist.creator_id&&!(playlist.collaborator_ids||[]).includes(m.id)).map(m=><button key={m.id} type="button" disabled={busy} onClick={()=>change(m.id,true)} className="w-full flex gap-3 items-center py-3 text-sm" aria-label={"Invite "+(m.display_name||m.username||"Listener")}><Avatar user={m} size={32}/><span className="flex-1 text-left">{m.display_name||m.username||"Listener"}</span>{busy?<Loader2 size={17} className="animate-spin"/>:<Plus size={17}/>}</button>)}</div>
 </DialogContent></Dialog>;
}
