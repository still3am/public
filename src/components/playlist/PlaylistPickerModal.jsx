import {addPlaylistTracks} from '@/lib/playlistActions';
import {useMyPlaylists} from '@/hooks/useMyPlaylists';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X,ListMusic,Plus,Check,Loader2,Search} from 'lucide-react';
import {Image} from '@/components/ui/image';
import {usePlaylistCover} from '@/hooks/usePlaylistCover';
import CreatePlaylistModal from '@/components/playlist/CreatePlaylistModal';
function PlaylistChoice({playlist,added,busy,onAdd}){
 const cover=usePlaylistCover(playlist),count=new Set(playlist.track_ids||[]).size;
 return <button onClick={onAdd} disabled={added||busy} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition text-left disabled:opacity-60"><div className="w-11 h-11 rounded-lg overflow-hidden bg-muted grid place-items-center shrink-0">{cover?<Image src={cover} fittingType="fill" alt="" className="w-full h-full"/>:<ListMusic size={18}/>}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{playlist.name}</p><p className="text-xs text-muted-foreground mt-1">{count} songs · {playlist.is_public?'Public':'Private'}</p></div>{busy?<Loader2 size={18} className="animate-spin"/>:added?<Check size={18}/>:<Plus size={16}/>}</button>;
}
export default function PlaylistPickerModal({track,onClose}){
 const {playlists,error,reload,loading}=useMyPlaylists();
 const [showCreate,setShowCreate]=useState(false),[query,setQuery]=useState(''),[added,setAdded]=useState(new Set()),[busy,setBusy]=useState(new Set());
 const locks=useRef(new Set()),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{setAdded(new Set());setQuery('');},[track?.id]);
 if(!track)return null;
 const matches=(playlists||[]).filter(playlist=>!query.trim()||[playlist.name,playlist.description].some(value=>(value||'').toLowerCase().includes(query.trim().toLowerCase())));
 const add=async playlist=>{
  const key=playlist.id+':'+track.id;if(locks.current.has(key)||added.has(playlist.id))return;
  if((playlist.track_ids||[]).includes(track.id))return;
  locks.current.add(key);setBusy(previous=>new Set(previous).add(playlist.id));
  try{await addPlaylistTracks(playlist.id,[track.id]);if(alive.current)setAdded(previous=>new Set(previous).add(playlist.id));}
  catch{/* Leave this playlist available for another attempt. */}
  finally{locks.current.delete(key);if(alive.current)setBusy(previous=>{const next=new Set(previous);next.delete(playlist.id);return next;});}
 };
 return createPortal(<div role="dialog" aria-modal="true" aria-label="Add song to playlists" data-public-dialog tabIndex={-1} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose();}}} className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/><section className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl flex flex-col max-h-[85dvh] pb-[env(safe-area-inset-bottom)]"><header className="flex items-center justify-between gap-3 p-5 border-b"><div className="min-w-0"><h2 className="text-lg font-bold">Add to playlist</h2><p className="text-xs text-muted-foreground truncate mt-1">{track.title}</p></div><button onClick={onClose} aria-label="Close playlist picker" className="tap-target rounded-full hover:bg-accent"><X size={19}/></button></header><div className="p-4 space-y-3"><button onClick={()=>setShowCreate(true)} className="chrome-button w-full"><Plus size={16}/>New playlist</button><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input aria-label="Search your playlists" placeholder="Find a playlist" value={query} onChange={event=>setQuery(event.target.value)} className="w-full border rounded-xl py-3 pl-10 pr-10 bg-background"/>{query&&<button aria-label="Clear playlist search" onClick={()=>setQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2 tap-target"><X size={15}/></button>}</div><p className="text-xs text-muted-foreground">You can add this song to more than one playlist.</p></div><div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">{error&&<button onClick={()=>reload()} className="playlist-action mb-3">Refresh playlists</button>}{!playlists?loading?<div className="py-10 grid place-items-center"><Loader2 className="animate-spin"/></div>:null:!matches.length?<div className="collection-empty"><p>{query?'No matching playlists.':'Create a playlist to start your collection.'}</p></div>:matches.map(playlist=><PlaylistChoice key={playlist.id} playlist={playlist} busy={busy.has(playlist.id)} added={added.has(playlist.id)||(playlist.track_ids||[]).includes(track.id)} onAdd={()=>add(playlist)}/>)}</div></section>{showCreate&&<CreatePlaylistModal onClose={()=>setShowCreate(false)} onCreated={playlist=>{add(playlist);reload();}}/>}</div>,document.body);
}
