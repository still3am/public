import {useEffect,useRef,useState} from 'react';
import {Play,Loader2,ExternalLink,X} from 'lucide-react';
import {findMusicVideo} from '@/lib/musicVideos';
import {usePlayer} from '@/context/PlayerContext';
/** @param {{track:any}} props */
export default function DiscoverMusicVideo({track}){
 const p=usePlayer(),controller=useRef(null);
 const [state,setState]=useState({loading:false,video:null,error:'',searched:false}),[watching,setWatching]=useState(false);
 useEffect(()=>()=>controller.current?.abort(),[track.id]);
 // Removing the iframe stops its playback when Public audio resumes.
 useEffect(()=>{if(p.isPlaying)setWatching(false);},[p.isPlaying]);
 async function search(){
  if(state.loading)return;controller.current?.abort();const current=new AbortController();controller.current=current;
  setState({loading:true,video:null,error:'',searched:false});
  try{const video=await findMusicVideo(track,{signal:current.signal});if(!current.signal.aborted)setState({loading:false,video,error:'',searched:true});}
  catch(error){if(!current.signal.aborted)setState({loading:false,video:null,error:error.message,searched:true});}
 }
 const youtubeSearch='https://www.youtube.com/results?'+new URLSearchParams({search_query:[track.artist,track.title,'official music video'].filter(Boolean).join(' ')});
 return <section className="track-page-section music-video-section" aria-label="Discover music video"><h2 className="text-lg font-bold mb-3">Music video</h2>
  {!state.searched&&!state.loading&&<p className="text-sm text-muted-foreground mb-3">Find this song’s video and watch it here on YouTube.</p>}
  {!state.video&&<button className="playlist-action" disabled={state.loading} onClick={search}>{state.loading?<Loader2 size={15} className="animate-spin"/>:<Play size={15}/>} {state.loading?'Finding video…':state.searched?'Retry video search':'Find music video'}</button>}
  {state.error&&<p role="status" className="text-xs text-muted-foreground mt-3">{state.error}</p>}
  {state.searched&&!state.video&&!state.error&&<p role="status" className="text-sm text-muted-foreground mt-3">No matching video in this catalog yet.</p>}
  {state.video&&<div className="music-video-card">
   {watching?<><iframe src={`https://www.youtube-nocookie.com/embed/${state.video.id}?playsinline=1&rel=0`} title={`${track.title} — music video on YouTube`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="w-full aspect-video min-h-[200px] rounded-2xl border-0"/><button className="playlist-action mt-2" onClick={()=>setWatching(false)}><X size={14}/>Close video</button><p className="text-xs text-muted-foreground mt-2">If this video cannot play here, open it on YouTube.</p></>:<button className="playlist-action" onClick={()=>{if(p.isPlaying)p.togglePlay();setWatching(true);}}><Play size={15}/>Watch {state.video.title}</button>}
   <a className="text-xs underline inline-flex gap-1 items-center mt-3" href={`https://www.youtube.com/watch?v=${state.video.id}`} target="_blank" rel="noopener noreferrer">Watch on YouTube <ExternalLink size={12}/></a>
  </div>}
  <div className="flex flex-wrap gap-3 mt-3"><a href={youtubeSearch} target="_blank" rel="noopener noreferrer" className="text-xs underline">Search YouTube</a><a href="https://www.theaudiodb.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground">Video lookup by TheAudioDB</a></div>
 </section>;
}
