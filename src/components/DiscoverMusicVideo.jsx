import {useEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {usePlayer} from '@/context/PlayerContext';
import {searchMusicVideos} from '@/lib/youtubeSearch';
import YouTubeMusicVideo from './YouTubeMusicVideo';
/** @param {{track:any}} props */
export default function DiscoverMusicVideo({track}){
 const key=import.meta.env.VITE_YOUTUBE_API_KEY;
 const p=usePlayer(),location=useLocation(),route=useRef(location.key),request=useRef(null);
 const [items,setItems]=useState([]),[selected,setSelected]=useState(null),[loading,setLoading]=useState(false),[searched,setSearched]=useState(false),[error,setError]=useState('');
 useEffect(()=>()=>request.current?.abort(),[]);
 async function find(){
  request.current?.abort();const controller=new AbortController();request.current=controller;
  setLoading(true);setError('');setSearched(false);
  try{const result=await searchMusicVideos(track,key,{signal:controller.signal});if(!controller.signal.aborted){setItems(result);setSearched(true);}}
  catch(reason){if(!controller.signal.aborted)setError(reason.message);}
  finally{if(!controller.signal.aborted)setLoading(false);}
 }
 if(!key)return null;
 return <section className="track-page-section music-video-section">
  <h2>Music videos</h2>
  <p className="text-sm text-muted-foreground">Find matching videos on YouTube.</p>
  {!selected&&<button type="button" className="playlist-action mt-3" disabled={loading} onClick={find}>{loading?'Searching…':searched?'Search again':'Find music videos'}</button>}
  {error&&<p role="alert" className="text-sm mt-3">{error}</p>}
  {searched&&!items.length&&<p role="status" className="text-sm mt-3">No playable matches found on YouTube.</p>}
  {selected&&<div className="music-video-card mt-3">
   <YouTubeMusicVideo id={selected.id} title={selected.title} active={location.key===route.current} audioPlaying={p.isPlaying} onPlay={()=>{if(p.isPlaying)p.togglePlay();}}/>
   <h3>{selected.title}</h3><p>{selected.channel} · YouTube</p>
   <div className="flex flex-wrap gap-3 mt-3"><button type="button" className="playlist-action" onClick={()=>setSelected(null)}>Close video</button><a href={'https://www.youtube.com/watch?v='+selected.id} target="_blank" rel="noopener noreferrer" className="playlist-action">Open on YouTube</a></div>
  </div>}
  {!!items.length&&<ul className="grid gap-3 mt-4" aria-label="YouTube music video matches">{items.map(item=><li key={item.id}><button type="button" onClick={()=>setSelected(item)} className="flex items-center gap-3 text-left w-full rounded-xl p-2 hover:bg-white/5" aria-pressed={selected?.id===item.id}>
   {item.thumbnail&&<img src={item.thumbnail} alt="" loading="lazy" className="w-24 rounded-lg aspect-video object-cover"/>}<span><span className="block text-sm">{item.title}</span><span className="block text-xs text-muted-foreground">{item.channel} · YouTube</span></span>
  </button></li>)}</ul>}
 </section>;
}
