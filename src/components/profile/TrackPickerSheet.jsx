import {useDeferredValue,useEffect,useMemo,useRef,useState} from "react";
import {getPublishedTracks,peekPublishedTracks,subscribePublishedTracks} from "@/lib/catalogCache";
import {useCoverUrl} from "@/hooks/useCoverUrl";
import {Image} from "@/components/ui/image";
import {Check,Search,Loader2,Music2,X} from "lucide-react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
function Cover({url}){
 let cdn=false;try{cdn=["media.base44.com","static.wixstatic.com"].includes(new URL(url).hostname);}catch{}
 const fixed=useCoverUrl(cdn?"":url);
 const source=cdn?url:fixed;
 return source?<Image src={source} fittingType="fill" alt="" className="block w-full h-full" decoding="async"/>:<Music2 size={18}/>;
}
export default function TrackPickerSheet({title,selectedIds=[],max=1,tracks=[],onToggle,onClose}){
 const [query,setQuery]=useState(""),[scope,setScope]=useState("all"),[published,setPublished]=useState(peekPublishedTracks),[loading,setLoading]=useState(true),[limit,setLimit]=useState(50),[selecting,setSelecting]=useState("");
 const sentinel=useRef(null),scroll=useRef(null),lock=useRef(false);
 const deferred=useDeferredValue(query);
 useEffect(()=>{let active=true;const unsubscribe=subscribePublishedTracks(rows=>{if(active)setPublished(rows);});getPublishedTracks().then(rows=>{if(active)setPublished(rows);}).catch(()=>{}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;unsubscribe();};},[]);
 const indexed=useMemo(()=>{
  const merged=new Map();
  for(const track of [...tracks,...published]){if(!track?.id)continue;const previous=merged.get(track.id);merged.set(track.id,{...previous,...track,cover_art_url:track.cover_art_url||previous?.cover_art_url||""});}
  return [...merged.values()].map(t=>({track:t,search:[t.title,t.artist,t.uploader_name,t.genre].filter(Boolean).join(" ").toLowerCase()}));
 },[tracks,published]);
 const ownIds=useMemo(()=>new Set(tracks.map(t=>t.id)),[tracks]);
 const filtered=useMemo(()=>{const term=deferred.trim().toLowerCase();return indexed.filter(row=>(scope!=="own"||ownIds.has(row.track.id))&&(!term||row.search.includes(term))).map(row=>row.track);},[indexed,deferred,scope,ownIds]);
 useEffect(()=>{setLimit(50);scroll.current?.scrollTo({top:0});},[deferred,scope]);
 useEffect(()=>{const target=sentinel.current;if(!target||limit>=filtered.length)return;const observer=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting)setLimit(n=>Math.min(n+50,filtered.length));},{root:scroll.current,rootMargin:"250px"});observer.observe(target);return()=>observer.disconnect();},[limit,filtered.length]);
 const select=async track=>{if(lock.current)return;lock.current=true;setSelecting(track.id);try{await onToggle(track.id,track);}finally{lock.current=false;setSelecting("");}};
 return <Dialog open onOpenChange={open=>{if(!open&&!selecting)onClose();}}><DialogContent className="profile-song-picker"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{max===1?"Pick the sound that represents you.":`Choose up to ${max} songs for your profile.`}</DialogDescription></DialogHeader>
 <div className="profile-picker-search"><Search size={17}/><input aria-label="Search profile songs" placeholder="Search songs, artists, or genres" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape"&&query){e.stopPropagation();setQuery("");}}}/>{query&&<button aria-label="Clear song search" onClick={()=>setQuery("")}><X size={16}/></button>}</div>
 <div className="view-switch" role="group" aria-label="Song source"><button aria-pressed={scope==="all"} className={scope==="all"?"active":""} onClick={()=>setScope("all")}>All music</button><button aria-pressed={scope==="own"} className={scope==="own"?"active":""} onClick={()=>setScope("own")}>Your uploads</button></div>
 <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{filtered.length} songs{max>1?` · ${selectedIds.length}/${max} selected`:""}</span>{loading&&<span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin"/>Loading more</span>}</div>
 <div ref={scroll} className="profile-picker-list" aria-busy={!!selecting}>{!filtered.length?<div className="text-center py-10 text-sm text-muted-foreground">{loading?"Finding your music…":query?"No matching songs. Try another artist or title.":"No songs here yet."}</div>:filtered.slice(0,limit).map(track=>{const selected=selectedIds.includes(track.id),canSelect=max===1||selected||selectedIds.length<max;return <button key={track.id} disabled={!!selecting||!canSelect} aria-pressed={selected} onClick={()=>select(track)} className={`profile-picker-row ${selected?"selected":""}`}><div className="profile-picker-cover"><Cover url={track.cover_art_url}/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{track.title}</p><p className="text-xs text-muted-foreground truncate mt-0.5">{track.artist||track.uploader_name||"Unknown"}</p></div>{selecting===track.id?<Loader2 size={18} className="animate-spin"/>:selected?<Check size={18}/>:null}</button>;})}<div ref={sentinel}/>{limit<filtered.length&&<button className="playlist-action mx-auto mt-3 flex" onClick={()=>setLimit(n=>n+50)}>Show more songs</button>}</div>
 </DialogContent></Dialog>;
}
