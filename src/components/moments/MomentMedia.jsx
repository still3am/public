import {useEffect,useRef,useState} from 'react';
import {Play,Pause,Volume2,VolumeX,ChevronLeft,ChevronRight,Loader2} from 'lucide-react';
import {base44} from '@/api/base44Client';
import {usePlayer} from '@/context/PlayerContext';

// One audible Moment at a time. Scrolling away, opening a dialog, hiding
// the app or starting the regular player releases both audio and video.
export default function MomentMedia({post,active,onActive,muted=false,onToggleMute,draftPreview=false}){
 const audio=useRef(null),video=useRef(null),box=useRef(null),progressBar=useRef(null),player=usePlayer(),alive=useRef(true),request=useRef(0);
 const [source,setSource]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[index,setIndex]=useState(0);
 const [inView,setInView]=useState(false),[controls,setControls]=useState(false),[needsTap,setNeedsTap]=useState(false);
 const touch=useRef(null),lastSwipe=useRef(0),direction=useRef(1),photoSizes=useRef(new Map());
 const [touching,setTouching]=useState(false),[photoChanged,setPhotoChanged]=useState(false);
 const hideTimer=useRef(null),photo=useRef(null),still=useRef(null);
 const [pausedGif,setPausedGif]=useState(false);
 const [widePhoto,setWidePhoto]=useState('');
 const photoCount=post.media?.length||0;
 const photoUrl=post.media?.[index]?.url;
 const isGif=/\.gif(?:[?#]|$)/i.test(photoUrl||'');
 const showPhotoBackdrop=!pausedGif&&!!photoUrl&&(widePhoto===photoUrl||photoSizes.current.get(photoUrl)===true);
 const isVideo=post.media?.[0]?.type==='video',start=Number(post.clip_start)||0,length=Number(post.clip_duration)||30;
 const playerRef=useRef(player);playerRef.current=player;
 const stop=()=>{request.current++;audio.current?.pause();video.current?.pause();};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;clearTimeout(hideTimer.current);stop();};},[]);
 useEffect(()=>{
  const node=box.current;if(!node)return;let cancelled=false,started=false;
  const prepare=async()=>{if(started||!post.track?.id)return;started=true;setLoading(true);try{const t=post.track.audio_url?post.track:await base44.entities.Track.get(post.track.id);if(!t.audio_url)throw Error('Song unavailable.');if(!cancelled)setSource(t.audio_url);}catch(e){if(!cancelled)setError(e?.response?.data?.error||'Song preview unavailable. You can still open the full song.');}finally{if(!cancelled)setLoading(false);}};
  const observer=new IntersectionObserver(entries=>{const visible=(entries[0]?.intersectionRatio??0)>=.6;setInView(visible);if(visible)prepare();else{setPausedGif(false);clearTimeout(hideTimer.current);setControls(false);setNeedsTap(false);stop();onActive(false);}},{threshold:.6});observer.observe(node);
  return()=>{cancelled=true;observer.disconnect();stop();};
 },[post.id,post.track?.id]);
 useEffect(()=>{if(!active)stop();},[active]);
 useEffect(()=>{stop();onActive(false);setIndex(0);if(audio.current)audio.current.currentTime=start;if(video.current)video.current.currentTime=0;updateProgress(0);},[start,length]);
 useEffect(()=>{if(player.isPlaying){stop();onActive(false);}},[player.isPlaying]);
 useEffect(()=>{const hide=()=>{if(document.hidden){stop();onActive(false);}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 useEffect(()=>{if(audio.current){audio.current.volume=Number(post.music_volume??.8);audio.current.muted=muted;}if(video.current){video.current.volume=Number(post.original_volume??0);video.current.muted=muted||Number(post.original_volume??0)===0;}},[muted,post.music_volume,post.original_volume]);
 useEffect(()=>{
  if(!draftPreview&&inView&&source&&!player.isPlaying&&!document.hidden&&!document.querySelector('[role="dialog"][data-state="open"]')) startPlayback();
 },[inView,source]);
 function revealControls(){
  clearTimeout(hideTimer.current);
  setControls(true);
  hideTimer.current=setTimeout(()=>setControls(false),3200);
 }
 function tapSurface(){
  if(Date.now()-lastSwipe.current<350)return;
  if(needsTap&&source){startPlayback();return;}
  if(controls){clearTimeout(hideTimer.current);setControls(false);}else revealControls();
 }
 function play(){
  revealControls();
  if(active){
   stop();
   if(isGif&&photo.current?.complete&&photo.current.naturalWidth){
    const image=photo.current,canvas=still.current;
    if(canvas){
     canvas.width=image.naturalWidth;
     canvas.height=image.naturalHeight;
     const context=canvas.getContext('2d');
     if(context){context.drawImage(image,0,0);setPausedGif(true);}
    }
   }
   onActive(false);
   return;
  }
  startPlayback();
 }
 async function startPlayback(){
  if(!source&&!isVideo){setError('The music is still loading. Please try again.');return;}
  setPausedGif(false);setError('');setNeedsTap(false);playerRef.current.pausePlayback?.();onActive(true);const version=++request.current;
  try{
   const a=audio.current,v=video.current;if(a&&source){if(a.currentTime<start||a.currentTime>=start+length)a.currentTime=start;}
   const promises=[];if(v)promises.push(v.play());if(a&&source)promises.push(a.play());await Promise.all(promises);
   if(!alive.current){a?.pause();v?.pause();}
  }catch(e){if(version!==request.current||!alive.current)return;stop();onActive(false);setNeedsTap(true);if(e?.name!=='NotAllowedError'&&e?.name!=='AbortError')setError('Could not start playback. Tap play to retry.');}
 }
 function updateProgress(fraction){
  if(progressBar.current)progressBar.current.style.transform='scaleX('+Math.max(0,Math.min(1,fraction||0))+')';
 }
 useEffect(()=>{
  if(isVideo||photoCount<2||!inView||(!active&&!needsTap)||touching||document.hidden)return;
  const timer=setTimeout(()=>{
   if(document.hidden||document.querySelector('[role="dialog"][data-state="open"]')&&!draftPreview)return;
   direction.current=1;
   setPhotoChanged(true);
   setPausedGif(false);
   setIndex((current)=>(current+1)%photoCount);
  },Math.max(2800,Math.min(4800,length*1000/photoCount)));
  return()=>clearTimeout(timer);
 },[active,needsTap,inView,isVideo,photoCount,touching,index,length,draftPreview]);
 useEffect(()=>{
  if(isVideo||!inView||photoCount<2)return;
  const next=post.media[(index+1)%photoCount]?.url;
  if(!next||photoSizes.current.has(next))return;
  const image=new Image();
  image.onload=()=>{photoSizes.current.set(next,!!image.naturalHeight&&image.naturalWidth/image.naturalHeight>=.82);};
  image.src=next;
  return()=>{image.onload=null;};
 },[post.media,photoCount,inView,isVideo,index]);
 function tick(){
  const a=audio.current;
  if(!a)return;
  if(a.currentTime>=start+length)a.currentTime=start;
  updateProgress((a.currentTime-start)/length);
 }
 function videoTick(){const a=audio.current,v=video.current;if(!v||!active)return;if(!a||!source){updateProgress(v.currentTime/v.duration);return;}const desired=start+(v.currentTime%length);if(Math.abs(a.currentTime-desired)>.6)a.currentTime=desired;}
 function end(){stop();onActive(false);updateProgress(0);if(video.current)video.current.currentTime=0;if(audio.current)audio.current.currentTime=start;}
 function movePhoto(step){
  direction.current=step;setPhotoChanged(true);setPausedGif(false);
  setIndex(current=>Math.max(0,Math.min(post.media.length-1,current+step)));
 }
 function startSwipe(event){
  const point=event.touches[0];
  if(isVideo||post.media.length<2||event.touches.length!==1||event.target.closest('.moment-photo-controls, .moment-media-play, .moment-media-mute')){touch.current=null;return;}
  touch.current={x:point.clientX,y:point.clientY};setTouching(true);
 }
 function finishSwipe(event){
  const origin=touch.current,point=event.changedTouches[0];
  touch.current=null;setTouching(false);
  if(!origin||!point)return;
  const x=point.clientX-origin.x,y=point.clientY-origin.y;
  if(Math.abs(x)<44||Math.abs(x)<Math.abs(y)*1.35)return;
  lastSwipe.current=Date.now();movePhoto(x<0?1:-1);
 }
 return <div ref={box} className="moment-media-wrap" data-photo-swipe={!isVideo&&post.media.length>1} onTouchStart={startSwipe} onTouchEnd={finishSwipe} onTouchCancel={()=>{touch.current=null;setTouching(false);}}>
  <div className={'moment-media'+(!isVideo&&showPhotoBackdrop?' is-wide-photo':'')} data-playing={active} data-controls={controls||needsTap} style={!isVideo&&showPhotoBackdrop?{'--moment-photo':'url('+JSON.stringify(photoUrl)+')'}:undefined}>
   {isVideo?<video ref={video} src={post.media[0].url} playsInline preload="metadata" muted={muted||Number(post.original_volume??0)===0} onTimeUpdate={videoTick} onEnded={end} onError={()=>setError('This video cannot play in this browser.')} aria-label="Moment video"/>:<img key={photoUrl} ref={photo} data-photo-motion={photoChanged?(direction.current<0?'backward':'forward'):undefined} hidden={pausedGif} src={photoUrl} alt={post.caption||'Photo shared in a Moment'} loading="lazy" onLoad={(event)=>{const {naturalWidth,naturalHeight}=event.currentTarget;setWidePhoto(naturalHeight&&naturalWidth/naturalHeight>=.82?photoUrl:'');}}/>}
   {isGif&&<canvas ref={still} className={showPhotoBackdrop||widePhoto===photoUrl?'moment-gif-still is-wide':'moment-gif-still'} hidden={!pausedGif} aria-hidden="true" />}
   {!draftPreview&&<button type="button" className="moment-tap-surface" onClick={tapSurface} aria-label={needsTap?'Tap to start playback':'Toggle playback controls'} />}
   <button type="button" className="moment-media-play" onClick={play} disabled={loading||(!source&&!isVideo)} aria-label={active?'Pause moment':'Play moment'}>{loading?<Loader2 size={20} className="animate-spin"/>:active?<Pause size={20}/>:<Play size={20} fill="currentColor"/>}</button>
   {!draftPreview&&<button type="button" className="moment-media-mute" onClick={()=>{onToggleMute?.();revealControls();}} aria-label={muted?'Unmute moment':'Mute moment'}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>}
   {!isVideo&&post.media.length>1&&<div className="moment-photo-controls"><button type="button" aria-label="Previous photo" disabled={index===0} onClick={()=>movePhoto(-1)}><ChevronLeft size={20}/></button><span>{index+1} / {post.media.length}</span><button type="button" aria-label="Next photo" disabled={index===post.media.length-1} onClick={()=>movePhoto(1)}><ChevronRight size={20}/></button></div>}
   <div className="moment-playback-progress" aria-hidden="true"><span ref={progressBar}/></div>
   <audio ref={audio} src={source||undefined} preload="metadata" onLoadedMetadata={()=>{if(audio.current)audio.current.currentTime=start;}} onTimeUpdate={tick} onEnded={()=>{if(active){audio.current.currentTime=start;audio.current.play().catch(end);}}} onError={()=>{setError('This song preview could not load.');end();}}/>
  </div>
  {error&&<p className="moment-inline-message" role="status">{error}</p>}
 </div>;
}
