import {useEffect,useRef,useState} from 'react';
import {loadYouTubePlayer,youtubeEmbedUrl,youtubeErrorMessage} from '@/lib/youtubePlayer';
/** @param {{id:string,title:string,audioPlaying:boolean,onPlay:()=>void,active?:boolean}} props */
export default function YouTubeMusicVideo({id,title,audioPlaying,onPlay,active=true}){
 const frame=useRef(null),player=useRef(null),onPlayRef=useRef(onPlay),activeRef=useRef(active),audioRef=useRef(audioPlaying);
 onPlayRef.current=onPlay;activeRef.current=active;audioRef.current=audioPlaying;
 const [status,setStatus]=useState('loading'),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let alive=true;let instance;setStatus('loading');setError('');
  loadYouTubePlayer().then(YT=>{
   if(!alive||!frame.current)return;
   instance=new YT.Player(frame.current,{events:{
    onReady:event=>{if(!alive)return;player.current=event.target;setStatus('ready');if(!activeRef.current)event.target.pauseVideo();},
    onStateChange:event=>{if(!alive)return;if(event.data===1){if(!activeRef.current){event.target.pauseVideo();return;}onPlayRef.current();}},
    onError:event=>{if(alive){setStatus('error');setError(youtubeErrorMessage(event.data));}}
   }});player.current=instance;
  }).catch(reason=>{if(alive){setStatus('error');setError(reason.message);}});
  const timeout=setTimeout(()=>{if(alive)setStatus(previous=>{if(previous==='loading'){setError('YouTube is taking too long to load. Retry or open on YouTube.');return 'error';}return previous;});},16000);
  const pause=()=>player.current?.pauseVideo?.();
  const visibility=()=>{if(document.hidden)pause();};
  window.addEventListener('pagehide',pause);document.addEventListener('visibilitychange',visibility);
  return()=>{alive=false;clearTimeout(timeout);window.removeEventListener('pagehide',pause);document.removeEventListener('visibilitychange',visibility);player.current=null;try{instance?.destroy();}catch{}};
 },[id,retry]);
 useEffect(()=>{if(audioPlaying||!active)player.current?.pauseVideo?.();},[audioPlaying,active]);
 return <div><div className="youtube-music-frame" style={{width:'100%',aspectRatio:'16 / 9',minHeight:200,position:'relative',background:'#101114',borderRadius:14,overflow:'hidden'}}>
  <iframe key={`${id}:${retry}`} ref={frame} src={youtubeEmbedUrl(id,window.location.origin)} title={title+' — music video on YouTube'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{width:'100%',height:'100%',minHeight:200,border:0,display:'block',position:'absolute',inset:0}}/>
 </div>{status==='loading'&&<p role="status" className="text-xs text-muted-foreground mt-2">Loading YouTube player…</p>}{error&&<div role="status" className="text-sm mt-3"><p>{error}</p><button type="button" className="playlist-action mt-2" onClick={()=>setRetry(v=>v+1)}>Retry player</button></div>}</div>;
}
