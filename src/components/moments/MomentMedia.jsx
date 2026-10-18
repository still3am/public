import {useEffect,useRef,useState} from 'react';
import {Play,Pause,Volume2,VolumeX,ChevronLeft,ChevronRight,Loader2} from 'lucide-react';
import {base44} from '@/api/base44Client';
import {usePlayer} from '@/context/PlayerContext';

// One explicit sound source at a time. Scrolling away, opening a dialog, hiding
// the app or starting the regular player releases both audio and video.
export default function MomentMedia({post,active,onActive}){
 const audio=useRef(null),video=useRef(null),box=useRef(null),player=usePlayer(),alive=useRef(true),request=useRef(0);
 const [source,setSource]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[muted,setMuted]=useState(false),[index,setIndex]=useState(0);
 const isVideo=post.media?.[0]?.type==='video',start=Number(post.clip_start)||0,length=Number(post.clip_duration)||30;
 const playerRef=useRef(player);playerRef.current=player;
 const stop=()=>{request.current++;audio.current?.pause();video.current?.pause();};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;stop();};},[]);
 useEffect(()=>{
  const node=box.current;if(!node)return;let cancelled=false,started=false;
  const prepare=async()=>{if(started||!post.track?.id)return;started=true;setLoading(true);try{const t=post.track.audio_url?post.track:await base44.entities.Track.get(post.track.id);if(!t.audio_url)throw Error('Song unavailable.');if(!cancelled)setSource(t.audio_url);}catch(e){if(!cancelled)setError(e?.response?.data?.error||'Song preview unavailable. You can still open the full song.');}finally{if(!cancelled)setLoading(false);}};
  const observer=new IntersectionObserver(entries=>{const visible=entries[0]?.isIntersecting;if(visible)prepare();else{stop();onActive(false);}},{threshold:.15});observer.observe(node);
  return()=>{cancelled=true;observer.disconnect();stop();};
 },[post.id,post.track?.id]);
 useEffect(()=>{if(!active)stop();},[active]);
 useEffect(()=>{stop();onActive(false);setIndex(0);if(audio.current)audio.current.currentTime=start;if(video.current)video.current.currentTime=0;},[start,length]);
 useEffect(()=>{if(player.isPlaying){stop();onActive(false);}},[player.isPlaying]);
 useEffect(()=>{const hide=()=>{if(document.hidden){stop();onActive(false);}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 useEffect(()=>{if(audio.current){audio.current.volume=Number(post.music_volume??.8);audio.current.muted=muted;}if(video.current){video.current.volume=Number(post.original_volume??0);video.current.muted=muted||Number(post.original_volume??0)===0;}},[muted,post.music_volume,post.original_volume]);
 async function play(){
  if(active){stop();onActive(false);return;}
  if(!source&&!isVideo){setError('The music is still loading. Please try again.');return;}
  setError('');playerRef.current.pausePlayback?.();onActive(true);const version=++request.current;
  try{
   const a=audio.current,v=video.current;if(a&&source){if(a.currentTime<start||a.currentTime>=start+length)a.currentTime=start;}
   const promises=[];if(v)promises.push(v.play());if(a&&source)promises.push(a.play());await Promise.all(promises);
   if(version!==request.current||!alive.current){a?.pause();v?.pause();}
  }catch{stop();onActive(false);setError('Tap play again to start this moment.');}
 }
 function tick(){const a=audio.current;if(!a)return;if(a.currentTime>=start+length){a.currentTime=start;if(!isVideo)setIndex(0);}if(!isVideo&&active)setIndex(Math.min(post.media.length-1,Math.floor(Math.max(0,a.currentTime-start)/length*post.media.length)));}
 function videoTick(){const a=audio.current,v=video.current;if(!a||!v||!active||!source)return;const desired=start+(v.currentTime%length);if(Math.abs(a.currentTime-desired)>.6)a.currentTime=desired;}
 function end(){stop();onActive(false);if(video.current)video.current.currentTime=0;if(audio.current)audio.current.currentTime=start;}
 return <div ref={box} className="moment-media-wrap">
  <div className="moment-media">
   {isVideo?<video ref={video} src={post.media[0].url} playsInline preload="metadata" muted={muted||Number(post.original_volume??0)===0} onTimeUpdate={videoTick} onEnded={end} onError={()=>setError('This video cannot play in this browser.')} aria-label="Moment video"/>:<img src={post.media[index]?.url} alt={post.caption||'Photo shared in a Moment'} loading="lazy"/>}
   <button type="button" className="moment-media-play" onClick={play} disabled={loading||(!source&&!isVideo)} aria-label={active?'Pause moment':'Play moment'}>{loading?<Loader2 size={20} className="animate-spin"/>:active?<Pause size={20}/>:<Play size={20} fill="currentColor"/>}</button>
   <button type="button" className="moment-media-mute" onClick={()=>setMuted(v=>!v)} aria-label={muted?'Unmute moment':'Mute moment'}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
   {!isVideo&&post.media.length>1&&<div className="moment-photo-controls"><button type="button" aria-label="Previous photo" disabled={index===0} onClick={()=>setIndex(n=>n-1)}><ChevronLeft size={20}/></button><span>{index+1} / {post.media.length}</span><button type="button" aria-label="Next photo" disabled={index===post.media.length-1} onClick={()=>setIndex(n=>n+1)}><ChevronRight size={20}/></button></div>}
   <audio ref={audio} src={source||undefined} preload="metadata" onLoadedMetadata={()=>{if(audio.current)audio.current.currentTime=start;}} onTimeUpdate={tick} onEnded={()=>{if(active){audio.current.currentTime=start;audio.current.play().catch(end);}}} onError={()=>{setError('This song preview could not load.');end();}}/>
  </div>
  {error&&<p className="moment-inline-message" role="status">{error}</p>}
 </div>;
}
