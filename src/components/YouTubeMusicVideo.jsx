import {useEffect,useRef,useState} from 'react';
import {loadYouTubePlayer,youtubeEmbedUrl,youtubeErrorMessage} from '@/lib/youtubePlayer';
/** @param {{id:string,title:string,audioPlaying:boolean,onPlay:()=>void,active?:boolean}} props */
export default function YouTubeMusicVideo({id,title,audioPlaying,onPlay,active=true}){
 const frame=useRef(null),player=useRef(null),onPlayRef=useRef(onPlay),activeRef=useRef(active);
 onPlayRef.current=onPlay;activeRef.current=active;
 const [status,setStatus]=useState('loading'),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let alive=true,ready=false;let instance;setStatus('loading');setError('');
  loadYouTubePlayer().then(YT=>{
   if(!alive||!frame.current)return;
   const iframe=document.createElement('iframe');
   iframe.src=youtubeEmbedUrl(id,window.location.origin);iframe.title=title+' — music video on YouTube';iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
   Object.assign(iframe.style,{width:'100%',height:'100%',minHeight:'200px',border:'0',display:'block',position:'absolute',inset:'0'});
   frame.current.replaceChildren(iframe);
   instance=new YT.Player(iframe,{events:{
    onReady:event=>{if(!alive)return;player.current=event.target;ready=true;setStatus('ready');if(!activeRef.current)event.target.pauseVideo();},
    onStateChange:event=>{if(!alive)return;if(event.data===1){if(!activeRef.current){event.target.pauseVideo();return;}onPlayRef.current();}},
    onError:event=>{if(alive){ready=true;setStatus('error');setError(youtubeErrorMessage(event.data));}}
   }});player.current=instance;
  }).catch(reason=>{if(alive){setStatus('error');setError(reason.message);}});
  const timeout=setTimeout(()=>{if(alive&&!ready){setError('YouTube is taking too long to load. Retry or open on YouTube.');setStatus('error');}},16000);
  const pause=()=>player.current?.pauseVideo?.();
  const visibility=()=>{if(document.hidden)pause();};
  window.addEventListener('pagehide',pause);document.addEventListener('visibilitychange',visibility);
  return()=>{alive=false;clearTimeout(timeout);window.removeEventListener('pagehide',pause);document.removeEventListener('visibilitychange',visibility);player.current=null;try{instance?.destroy();}catch{}};
 },[id,retry]);
 useEffect(()=>{if(audioPlaying||!active)player.current?.pauseVideo?.();},[audioPlaying,active]);
 return <div><div ref={frame} className="youtube-music-frame" style={{width:'100%',aspectRatio:'16 / 9',minHeight:200,position:'relative',background:'#101114',borderRadius:14,overflow:'hidden'}}/>
 {status==='loading'&&<p role="status" className="text-xs text-muted-foreground mt-2">Loading YouTube player…</p>}{error&&<div role="status" className="text-sm mt-3"><p>{error}</p><button type="button" className="playlist-action mt-2" onClick={()=>setRetry(v=>v+1)}>Retry player</button></div>}</div>;
}
