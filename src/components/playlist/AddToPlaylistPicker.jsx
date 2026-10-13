import {readAllPages} from '@/lib/readPages';
import {addPlaylistTracks} from '@/lib/playlistActions';
import {getPublishedTracks,peekPublishedTracks} from '@/lib/catalogCache';
import {createPortal} from 'react-dom';
import {useState,useEffect,useMemo,useCallback,useRef} from 'react';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {useLibrary} from '@/context/LibraryContext';
import {Image} from '@/components/ui/image';
import {X,Plus,Check,Loader2,Search,Music2} from 'lucide-react';
const fields=['id','title','artist','uploader_name','uploader_id','cover_art_url','genre','duration_seconds','explicit','is_published'];
export default function AddToPlaylistPicker({playlist,onClose}){
 const {user}=useAuth(),{ids:libraryIds,refresh}=useLibrary();
 const [own,setOwn]=useState([]),[published,setPublished]=useState(peekPublishedTracks),[query,setQuery]=useState(''),[scope,setScope]=useState('all'),[selected,setSelected]=useState(new Set()),[saving,setSaving]=useState(false),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[limit,setLimit]=useState(60);
 const version=useRef(0),lock=useRef(false),alive=useRef(true);
 const ownParts=useRef({uid:user?.id,uploads:[],saved:[]});
 const libraryKey=[...libraryIds].join(',');
 const load=useCallback(async()=>{
  if(!user?.id)return;const request=++version.current;setLoading(true);setFailed(false);
  const local=(async()=>{
   const [uploads,saved]=await Promise.allSettled([
    readAllPages(options=>base44.entities.Track.filter({uploader_id:user.id},{sort:'-created_date',fields,...options})),
    (async()=>{const ids=[...libraryIds],rows=[];for(let start=0;start<ids.length;start+=200)rows.push(...await readAllPages(options=>base44.entities.Track.filter({id:{$in:ids.slice(start,start+200)}},{fields,...options})));return rows;})()
   ]);
   if(request!==version.current)return;
   if(ownParts.current.uid!==user.id)ownParts.current={uid:user.id,uploads:[],saved:[]};
   if(uploads.status==='fulfilled')ownParts.current.uploads=uploads.value;
   if(saved.status==='fulfilled')ownParts.current.saved=saved.value;
   setOwn([...new Map([...ownParts.current.uploads,...ownParts.current.saved].map(track=>[track.id,track])).values()]);
   if(uploads.status==='rejected'||saved.status==='rejected')setFailed(true);
  })();
  const catalogue=getPublishedTracks().then(rows=>{if(request===version.current)setPublished(rows);}).catch(()=>{if(request===version.current)setFailed(true);});
  await Promise.allSettled([local,catalogue]);if(request===version.current)setLoading(false);
 },[user?.id,libraryKey]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;version.current++;};},[]);
 useEffect(()=>{load();return()=>{version.current++;};},[load]);
 useEffect(()=>{setSelected(new Set());setQuery('');setScope('all');},[playlist?.id]);
 useEffect(()=>setLimit(60),[query,scope]);
 const existing=useMemo(()=>new Set(playlist?.track_ids||[]),[playlist]);
 const ownIds=useMemo(()=>new Set(own.map(track=>track.id)),[own]);
 const filtered=useMemo(()=>{const term=query.trim().toLowerCase(),rows=[...new Map([...published,...own].filter(track=>track?.id).map(track=>[track.id,track])).values()];return rows.filter(track=>(scope!=='own'||ownIds.has(track.id))&&(!term||[track.title,track.artist,track.uploader_name,track.genre].some(value=>(value||'').toLowerCase().includes(term))));},[published,own,scope,query,ownIds]);
 if(!playlist)return null;
 const selectable=filtered.filter(track=>!existing.has(track.id));
 const toggle=id=>setSelected(previous=>{const next=new Set(previous);next.has(id)?next.delete(id):next.add(id);return next;});
 const toggleVisible=()=>setSelected(previous=>{const next=new Set(previous),all=selectable.every(track=>previous.has(track.id));selectable.forEach(track=>all?next.delete(track.id):next.add(track.id));return next;});
 const save=async()=>{
  if(lock.current||!selected.size)return;lock.current=true;setSaving(true);
  try{const ids=[...selected].filter(id=>!existing.has(id));if(ids.length)await addPlaylistTracks(playlist.id,ids);if(alive.current)onClose();}
  catch{/* Keep the selection available for a retry. */}finally{lock.current=false;if(alive.current)setSaving(false);}
 };
 return createPortal(<div role="dialog" aria-modal="true" aria-label="Add songs to playlist" data-public-dialog tabIndex={-1} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose();}}} className="playlist-picker fixed inset-0 z-[70] bg-card text-foreground flex flex-col"><header className="flex items-center justify-between gap-3 px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-4 border-b shrink-0"><div className="min-w-0"><h2 className="text-lg font-bold truncate">Add to {playlist.name}</h2><p className="text-xs text-muted-foreground mt-1">{selected.size?`${selected.size} selected`:'Choose songs for this playlist'}</p></div><button onClick={onClose} aria-label="Close song picker" className="tap-target shrink-0 rounded-full hover:bg-accent"><X size={20}/></button></header><div className="px-5 py-4 space-y-3 shrink-0"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input aria-label="Search songs for this playlist" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Find a song, artist, or genre" className="w-full border rounded-xl bg-background pl-10 pr-11 py-3"/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear song search" className="absolute right-1 top-1/2 -translate-y-1/2 tap-target"><X size={15}/></button>}</div><div className="flex flex-wrap items-center gap-2"><div className="view-switch" role="group" aria-label="Song source"><button className={scope==='all'?'active':''} aria-pressed={scope==='all'} onClick={()=>setScope('all')}>All music</button><button className={scope==='own'?'active':''} aria-pressed={scope==='own'} onClick={()=>setScope('own')}>Your music</button></div>{selectable.length>0&&<button disabled={saving} onClick={toggleVisible} className="playlist-action text-xs">{selectable.every(track=>selected.has(track.id))?'Deselect results':'Select results'}</button>}{selected.size>0&&<button disabled={saving} onClick={()=>setSelected(new Set())} className="text-xs underline underline-offset-4">Clear selection</button>}</div>{failed&&<button className="playlist-action text-xs" onClick={async()=>{await refresh();load();}}>Refresh music</button>}</div><div className="flex-1 min-h-0 overflow-y-auto px-3 pb-6">{loading&&!filtered.length?<div className="py-12 grid place-items-center"><Loader2 className="animate-spin"/></div>:!filtered.length?<div className="collection-empty"><h3>No matching songs</h3><p>Try a different title or source.</p></div>:filtered.slice(0,limit).map(track=>{const added=existing.has(track.id),checked=selected.has(track.id);return <button key={track.id} disabled={added||saving} aria-pressed={added||checked} onClick={()=>toggle(track.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition disabled:opacity-60 ${checked?'bg-accent':'hover:bg-accent'}`}><div className="w-11 h-11 rounded-lg overflow-hidden bg-muted grid place-items-center shrink-0">{track.cover_art_url?<Image src={track.cover_art_url} fittingType="fill" alt="" className="w-full h-full"/>:<Music2 size={18}/>}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{track.title}</p><p className="text-xs text-muted-foreground truncate mt-1">{track.artist||track.uploader_name||'Unknown'}</p></div>{added?<span className="text-[10px] text-muted-foreground shrink-0">In playlist</span>:checked?<Check size={18} className="shrink-0"/>:<Plus size={16} className="shrink-0"/>}</button>;})}{limit<filtered.length&&<button className="playlist-action mx-auto flex mt-4" onClick={()=>setLimit(value=>value+60)}>Show more songs</button>}</div><footer className="border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-card shrink-0"><button onClick={save} disabled={saving||!selected.size} className="chrome-button w-full disabled:opacity-50">{saving?<Loader2 size={16} className="animate-spin"/>:<Plus size={16}/>} {saving?'Adding…':selected.size?`Add ${selected.size} songs`:'Select songs to add'}</button></footer></div>,document.body);
}
