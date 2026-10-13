import {useState,useEffect,useMemo,useCallback,useRef} from 'react';
import {useParams,useNavigate} from 'react-router-dom';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {usePlayer} from '@/context/PlayerContext';
import {readAllPages} from '@/lib/readPages';
import {removePlaylistTracks,reorderPlaylistTracks,movePlaylistTrack,shufflePlaylist} from '@/lib/playlistActions';
import {Play,Shuffle,Plus,Pencil,Trash2,Share2,ListMusic,Search,ArrowUp,ArrowDown,X,Check,Loader2,ImagePlus,ChevronLeft} from 'lucide-react';
import TrackRow from '@/components/TrackRow';
import AddToPlaylistPicker from '@/components/playlist/AddToPlaylistPicker';
import EmptyState from '@/components/EmptyState';
import LoadError from '@/components/LoadError';
import {useToast} from '@/components/ui/use-toast';
import {useCoverUrl} from '@/hooks/useCoverUrl';
export default function PlaylistDetail(){
 const {id}=useParams(),nav=useNavigate(),{user}=useAuth(),p=usePlayer(),{toast}=useToast();
 const [playlist,setPlaylist]=useState(null),[tracks,setTracks]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 const [editing,setEditing]=useState(false),[showAdd,setShowAdd]=useState(false),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
 const [query,setQuery]=useState(''),[sort,setSort]=useState('custom'),[selected,setSelected]=useState(new Set());
 const [form,setForm]=useState({name:'',description:'',is_public:true}),[coverFile,setCoverFile]=useState(null),[preview,setPreview]=useState('');
 const version=useRef(0),writeLock=useRef(false),imageMemo=useRef(null);
 const load=useCallback(async()=>{
  const v=++version.current;setLoading(true);setError(false);
  try{
   const pl=await base44.entities.Playlist.get(id),ids=[...new Set(pl.track_ids||[])];let list=[];
   for(let start=0;start<ids.length;start+=200)list.push(...await readAllPages(opts=>base44.entities.Track.filter({id:{$in:ids.slice(start,start+200)}},{...opts})));
   if(v!==version.current)return;
   const order=new Map(ids.map((id,i)=>[id,i]));list.sort((a,b)=>order.get(a.id)-order.get(b.id));
   setPlaylist(pl);setTracks(list);setForm({name:pl.name||'',description:pl.description||'',is_public:!!pl.is_public});
  }catch{if(v===version.current)setError(true);}finally{if(v===version.current)setLoading(false);}
 },[id]);
 useEffect(()=>{setSelected(new Set());setQuery('');setSort('custom');setSaved(false);load();return()=>{version.current++;};},[load]);
 useEffect(()=>{let alive=true;if(user?.id)base44.entities.SavedPlaylist.filter({user_id:user.id,playlist_id:id},'-created_date',1).then(rows=>{if(alive)setSaved(!!rows.length);}).catch(()=>{});return()=>{alive=false;};},[id,user?.id]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 const isOwn=!!user&&playlist?.creator_id===user.id;
 const cover=useCoverUrl(preview||playlist?.cover_art_url||tracks.find(t=>t.cover_art_url)?.cover_art_url||'');
 const view=useMemo(()=>{
  const term=query.trim().toLowerCase(),rows=tracks.filter(t=>!term||[t.title,t.artist,t.uploader_name].some(s=>s?.toLowerCase().includes(term)));
  if(sort==='title')rows.sort((a,b)=>(a.title||'').localeCompare(b.title||''));
  if(sort==='artist')rows.sort((a,b)=>(a.artist||'').localeCompare(b.artist||''));
  if(sort==='duration')rows.sort((a,b)=>(b.duration_seconds||0)-(a.duration_seconds||0));
  if(sort==='shortest')rows.sort((a,b)=>(a.duration_seconds||0)-(b.duration_seconds||0));
  return rows;
 },[tracks,query,sort]);
 const total=tracks.reduce((n,t)=>n+(t.duration_seconds||0),0),missing=Math.max(0,(playlist?.track_ids||[]).length-tracks.length);
 async function write(fn){
  if(writeLock.current)return;writeLock.current=true;setBusy(true);
  try{await fn();window.dispatchEvent(new Event('playlists:changed'));}
  catch(e){toast({title:e?.response?.data?.error||e.message||'Could not save. Retry.',variant:'destructive'});}
  finally{writeLock.current=false;setBusy(false);}
 }
 async function saveEdit(){
  if(!form.name.trim())return;
  await write(async()=>{
   let url=playlist.cover_art_url||'';
   if(coverFile){
    if(imageMemo.current?.file!==coverFile){const r=await base44.integrations.Core.UploadFile({file:coverFile});if(!r.file_url)throw Error('Artwork did not upload.');imageMemo.current={file:coverFile,url:r.file_url};}
    url=imageMemo.current.url;
   }
   const result=await base44.entities.Playlist.update(id,{name:form.name.trim(),description:form.description.trim(),is_public:form.is_public,cover_art_url:url});
   setPlaylist(result);setEditing(false);setPreview('');setCoverFile(null);toast({title:'Playlist updated'});
  });
 }
 async function move(t,delta){
  const original=playlist.track_ids||[],next=movePlaylistTrack(original,t.id,delta);
  if(next.every((id,i)=>id===original[i]))return;
  await write(async()=>{const updated=await reorderPlaylistTracks(id,next,original);setPlaylist(updated);const order=new Map(next.map((id,i)=>[id,i]));setTracks(prev=>[...prev].sort((a,b)=>order.get(a.id)-order.get(b.id)));});
 }
 async function remove(ids){
  if(!ids.length||!window.confirm('Remove '+ids.length+' song'+(ids.length===1?'':'s')+' from this playlist? The songs will stay on PUBLIC.'))return;
  await write(async()=>{const updated=await removePlaylistTracks(id,ids);setPlaylist(updated);setTracks(prev=>prev.filter(t=>!ids.includes(t.id)));setSelected(new Set());toast({title:'Removed from playlist'});});
 }
 async function share(){
  const url=window.location.origin+'/playlist/'+id;
  try{if(navigator.share)await navigator.share({title:playlist.name,url});else{await navigator.clipboard.writeText(url);toast({title:'Playlist link copied'});}}
  catch(e){if(e.name!=='AbortError')toast({title:'Could not share this link',variant:'destructive'});}
 }
 async function duplicate(){
  if(!user){nav('/login?returnTo='+encodeURIComponent(window.location.pathname));return;}
  await write(async()=>{const copy=await base44.entities.Playlist.create({name:(playlist.name+' — Copy').slice(0,160),description:playlist.description||'',cover_art_url:playlist.cover_art_url||'',is_public:false,track_ids:tracks.map(t=>t.id)});nav('/playlist/'+copy.id);toast({title:'Private playlist copy created'});});
 }
 async function toggleSaved(){
  if(!user){nav('/login?returnTo='+encodeURIComponent(window.location.pathname));return;}
  await write(async()=>{if(saved)await base44.entities.SavedPlaylist.deleteMany({user_id:user.id,playlist_id:id});else await base44.entities.SavedPlaylist.create({user_id:user.id,playlist_id:id});setSaved(!saved);toast({title:saved?'Removed from your library':'Added to your library'});});
 }
 const playAll=shuffle=>{if(!tracks.length)return;p.setShuffle(false);p.playTrackAt(shuffle?shufflePlaylist(tracks):tracks,0);};
 if(error)return <LoadError onRetry={load}/>;
 if(loading)return <div className="py-16 grid place-items-center"><Loader2 className="animate-spin"/></div>;
 if(!playlist)return <EmptyState title="Playlist unavailable"/>;
 return <div className="playlist-page max-w-6xl mx-auto pb-8">
  <button onClick={()=>nav('/library')} className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6"><ChevronLeft size={16}/>Library</button>
  <section className="playlist-hero">
   <div className="playlist-cover">{cover?<img src={cover} alt="Playlist cover" className="w-full h-full object-cover"/>:<ListMusic size={52} className="text-muted-foreground"/>}
    {isOwn&&editing&&<label className="absolute bottom-3 inset-x-3 bg-background/90 border rounded-full px-3 py-2 flex items-center justify-center gap-2 text-xs cursor-pointer"><ImagePlus size={15}/>Change cover<input aria-label="Playlist cover" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024){toast({title:'Choose a JPEG, PNG or WebP image under 10 MB',variant:'destructive'});return;}setCoverFile(f);setPreview(URL.createObjectURL(f));}}/></label>}
   </div>
   <div className="min-w-0 flex-1">
    <p className="eyebrow mb-3">{playlist.is_public?'Public playlist':'Private playlist'}</p>
    {editing?<input aria-label="Playlist name" maxLength={160} className="playlist-title bg-transparent border-b w-full" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>:<h1 className="playlist-title break-words">{playlist.name}</h1>}
    {editing?<><textarea aria-label="Playlist description" maxLength={2000} rows={3} className="w-full mt-4 bg-background border rounded-xl p-3 text-sm" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><label className="flex gap-2 items-center text-sm my-4"><input type="checkbox" checked={form.is_public} onChange={e=>setForm({...form,is_public:e.target.checked})}/>Public — anyone can find this playlist</label></>:playlist.description&&<p className="text-muted-foreground text-sm leading-relaxed max-w-xl mt-4 whitespace-pre-wrap">{playlist.description}</p>}
    <p className="text-sm text-muted-foreground mt-4 mb-5">{tracks.length} songs · {Math.floor(total/3600)>0?Math.floor(total/3600)+' hr ':''}{Math.floor(total/60)%60} min{missing>0?' · '+missing+' unavailable':''}</p>
    <div className="flex flex-wrap gap-2">
     {!editing&&<><button disabled={!tracks.length} onClick={()=>playAll(false)} className="chrome-button disabled:opacity-40"><Play size={16}/>Play</button><button disabled={!tracks.length} onClick={()=>playAll(true)} className="playlist-action"><Shuffle size={16}/>Shuffle play</button><button disabled={!tracks.length} onClick={()=>{p.addManyToQueue(tracks);toast({title:'Playlist added to queue'});}} className="playlist-action"><ListMusic size={16}/>Queue</button><button onClick={share} className="playlist-action" aria-label="Share playlist"><Share2 size={16}/></button></>}
     {isOwn&&!editing&&<><button disabled={busy} onClick={()=>setShowAdd(true)} className="playlist-action"><Plus size={16}/>Add songs</button><button onClick={()=>setEditing(true)} className="playlist-action"><Pencil size={16}/>Edit</button></>}
     {!isOwn&&!editing&&<button disabled={busy} onClick={toggleSaved} className="playlist-action">{saved?<Check size={16}/>:<Plus size={16}/>} {saved?'Saved':'Save playlist'}</button>}
     {!editing&&<button disabled={busy} onClick={duplicate} className="playlist-action">Make a copy</button>}
     {editing&&<><button disabled={busy||!form.name.trim()} onClick={saveEdit} className="chrome-button">{busy?'Saving…':'Save changes'}</button><button disabled={busy} onClick={()=>{setEditing(false);setCoverFile(null);setPreview('');setForm({name:playlist.name,description:playlist.description||'',is_public:!!playlist.is_public});}} className="playlist-action">Cancel</button><button disabled={busy} className="playlist-action text-destructive" onClick={()=>{if(confirm('Delete this playlist? Your songs will remain on PUBLIC.'))write(async()=>{await base44.entities.Playlist.delete(id);nav('/library');});}}><Trash2 size={16}/>Delete playlist</button></>}
    </div>
    {playlist.is_public&&tracks.some(t=>!t.is_published)&&<p className="text-xs text-muted-foreground mt-3">Private or pending songs are only playable by their owner until published.</p>}
    {!playlist.is_public&&<p className="text-xs text-muted-foreground mt-3">Sharing the link does not give other accounts access to a private playlist.</p>}
   </div>
  </section>
  <div className="playlist-toolbar">
   <div className="relative flex-1 max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input aria-label="Search this playlist" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQuery('');}} placeholder="Search in this playlist" className="w-full bg-background border rounded-xl pl-10 pr-12 py-2.5 text-sm"/>{query&&<button type="button" aria-label="Clear playlist search" onClick={()=>setQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X size={15}/></button>}</div>
   <select aria-label="Sort playlist" value={sort} onChange={e=>setSort(e.target.value)} className="bg-background border rounded-xl px-3 py-2.5 text-sm"><option value="custom">Playlist order</option><option value="title">Title</option><option value="artist">Artist</option><option value="duration">Longest first</option><option value="shortest">Shortest first</option></select>
   {isOwn&&view.length>0&&<button className="playlist-action text-xs" onClick={()=>setSelected(prev=>{const next=new Set(prev),allVisible=view.every(t=>prev.has(t.id));view.forEach(t=>{if(allVisible)next.delete(t.id);else next.add(t.id);});return next;})}>{view.every(t=>selected.has(t.id))?'Deselect visible':'Select visible'}</button>}
  </div>
  {selected.size>0&&isOwn&&<div className="flex items-center justify-between border rounded-xl p-3 mb-3 text-sm"><div className="flex flex-wrap items-center gap-3"><span>{selected.size} selected</span><button type="button" disabled={busy} onClick={()=>setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">Clear selection</button></div><button disabled={busy} onClick={()=>remove([...selected])} className="text-destructive inline-flex gap-2 items-center"><Trash2 size={15}/>Remove selected</button></div>}
  {!view.length?<EmptyState icon={ListMusic} title={query?'No matching songs':'No songs yet'} description={query?'Try a different title or artist.':'Add music to start building this playlist.'}/>:
   <div className="playlist-song-list">{view.map((t,i)=><div key={t.id} className="playlist-song-item">
    {isOwn&&<input aria-label={'Select '+t.title} type="checkbox" checked={selected.has(t.id)} onChange={()=>setSelected(prev=>{const next=new Set(prev);next.has(t.id)?next.delete(t.id):next.add(t.id);return next;})}/>}
    <div className="flex-1 min-w-0"><TrackRow track={t} index={i} queue={tracks} queueIndex={tracks.findIndex(row=>row.id===t.id)} showArt/></div>
    {isOwn&&<div className="playlist-row-actions"><button disabled={busy||sort!=='custom'||!!query||playlist.track_ids.indexOf(t.id)===0} onClick={()=>move(t,-1)} aria-label={'Move '+t.title+' up'}><ArrowUp size={15}/></button><button disabled={busy||sort!=='custom'||!!query||playlist.track_ids.indexOf(t.id)===playlist.track_ids.length-1} onClick={()=>move(t,1)} aria-label={'Move '+t.title+' down'}><ArrowDown size={15}/></button><button disabled={busy} onClick={()=>remove([t.id])} aria-label={'Remove '+t.title+' from playlist'}><X size={15}/></button></div>}
   </div>)}</div>}
  {isOwn&&(query||sort!=='custom')&&<p className="text-xs text-muted-foreground mt-3">Switch to Playlist order and clear search to rearrange songs.</p>}
  {showAdd&&<AddToPlaylistPicker playlist={playlist} onClose={()=>{setShowAdd(false);load();}}/>}
 </div>;
}
