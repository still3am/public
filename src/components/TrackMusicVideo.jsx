import {useEffect,useRef,useState} from "react";
import {Play,Loader2} from "lucide-react";
import {base44} from "@/api/base44Client";
import {usePlayer} from "@/context/PlayerContext";
import {useCoverUrl} from "@/hooks/useCoverUrl";
export default function TrackMusicVideo({track}){
 const p=usePlayer(),video=useRef(null),alive=useRef(true),lock=useRef(false);
 const [url,setUrl]=useState(""),[loading,setLoading]=useState(false),[notice,setNotice]=useState("");
 const poster=useCoverUrl(track.cover_art_url);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;video.current?.pause();};},[]);
 useEffect(()=>{if(p.isPlaying)video.current?.pause();},[p.isPlaying]);
 useEffect(()=>{if(url)video.current?.play().catch(()=>{});},[url]);
 async function watch(){
  if(lock.current)return;lock.current=true;setLoading(true);setNotice("");
  try{
   const result=(await base44.functions.invoke("securityGateway",{entity:"Track",action:"videoPlayback",args:[track.id]})).data?.result;
   if(!result?.url)throw Error();
   if(alive.current){setUrl(result.url);if(p.isPlaying)p.togglePlay();}
  }catch{if(alive.current)setNotice("Video couldn't load. Try again.");}
  finally{lock.current=false;if(alive.current)setLoading(false);}
 }
 return <section className="track-page-section music-video-section">
  <h2>Music Videos</h2>
  <div className="music-video-card">
   {url?<video ref={video} src={url} poster={poster||undefined} controls playsInline preload="metadata" controlsList={track.is_downloadable?undefined:"nodownload"} onPlay={()=>{if(p.isPlaying)p.togglePlay();}} onError={()=>{setUrl("");setNotice("Video couldn't play. Try again to refresh its link.");}} aria-label={track.title+" music video"}/>:<button type="button" className="music-video-poster" onClick={watch} disabled={loading} aria-label={"Watch "+track.title+" music video"}>{poster&&<img src={poster} alt=""/>}<span>{loading?<Loader2 size={24} className="animate-spin"/>:<Play size={27} fill="currentColor"/>}</span></button>}
   <h3>{track.title}</h3><p>{track.artist||track.uploader_name}</p>
   {notice&&<p role="status" className="text-xs text-muted-foreground mt-2">{notice}</p>}
  </div>
 </section>;
}
