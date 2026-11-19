import PureBadge from "@/components/PureBadge";
import OverflowText from "@/components/OverflowText";
import {useToast} from '@/components/ui/use-toast';
import {useState,useRef,useEffect} from "react";
import {Play,Pause,SkipBack,SkipForward,Volume2,VolumeX,ListMusic,X} from "lucide-react";
import {usePlayer} from "@/context/PlayerContext";
import FullScreenPlayer from "@/components/FullScreenPlayer";
import PlaybackSeekSlider from "@/components/PlaybackSeekSlider";
import QueuePanel from "@/components/QueuePanel";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";
import {useSidebarCollapsed} from "@/hooks/useSidebarCollapsed";
import {useOfflineCoverUrl} from "@/hooks/useOfflineCoverUrl";
import {useCoverUrl} from "@/hooks/useCoverUrl";
import "./player-dock.css";

export default function PlayerBar(){
  const p=usePlayer(),{toast}=useToast(),{collapsed}=useSidebarCollapsed();
  const [fullOpen,setFullOpen]=useState(false),[queueOpen,setQueueOpen]=useState(false),[coverFailed,setCoverFailed]=useState(false),[dragY,setDragY]=useState(0);
  const gesture=useRef(null),suppressClickUntil=useRef(0),lastVolume=useRef(.5);
  useEffect(()=>{const handler=event=>toast({title:event.detail,variant:"destructive"});window.addEventListener("player:error",handler);return()=>window.removeEventListener("player:error",handler);},[toast]);
  useEffect(()=>{if(p.volume>0)lastVolume.current=p.volume;},[p.volume]);
  useEffect(()=>{gesture.current=null;setDragY(0);if(!p.currentTrack?.id){setFullOpen(false);setQueueOpen(false);}},[p.currentTrack?.id]);
  const offlineCover=useOfflineCoverUrl(p.currentTrack?.id,p.currentTrack?.cover_art_url),coverUrl=useCoverUrl(offlineCover);
  useEffect(()=>{setCoverFailed(false);const retry=()=>setCoverFailed(false);window.addEventListener("online",retry);return()=>window.removeEventListener("online",retry);},[coverUrl]);

  const cancelGesture=()=>{gesture.current=null;setDragY(0);};
  const touchStart=event=>{
    if(!window.matchMedia("(max-width:767px)").matches||event.touches.length!==1)return;
    const control=event.target.closest?.("button,a,input,[role=slider]");
    if(control&&!control.classList.contains("player-dock-track"))return;
    const touch=event.touches[0];
    gesture.current={x:touch.clientX,y:touch.clientY,dy:0,moved:false};
  };
  const touchMove=event=>{
    const start=gesture.current;if(!start||event.touches.length!==1)return;
    const touch=event.touches[0],dx=touch.clientX-start.x,dy=touch.clientY-start.y;
    if(!start.moved&&Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)){cancelGesture();return;}
    if(Math.abs(dy)<12&&!start.moved)return;
    start.moved=true;start.dy=dy;
    setDragY(Math.max(-28,Math.min(66,dy*.5)));
  };
  const touchEnd=()=>{
    const start=gesture.current;cancelGesture();
    if(!start?.moved)return;
    suppressClickUntil.current=Date.now()+350;
    if(start.dy < -50)setFullOpen(true);
    else if(start.dy > 90)p.clearQueue();
  };
  const toggleMute=()=>{
    if(p.muted||p.volume===0){if(p.volume===0)p.setVolume(lastVolume.current||.5);p.setMuted(false);}
    else p.setMuted(true);
  };

  if(!p.currentTrack)return null;
  const track=p.currentTrack;
  const percent=p.duration>0?Math.max(0,Math.min(100,(p.position||0)/p.duration*100)):0;
  const upcoming=Math.max(0,(p.queue?.length||0)-(p.currentIndex||0)-1);
  const playLabel=p.isPlaying?"Pause":"Play";

  return <>
    <section aria-label="Music player" className="player-surface player-dock player-bar-mobile-bottom" data-collapsed={collapsed}
      style={{"--player-sidebar-width":collapsed?"68px":"256px",transform:dragY?`translateY(${dragY}px)`:undefined}}
      onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={touchEnd} onTouchCancel={cancelGesture}
      onClickCapture={event=>{if(Date.now()<suppressClickUntil.current){event.preventDefault();event.stopPropagation();}}}>
      <div className="player-dock-mobile-progress" aria-hidden="true"><span style={{width:percent+"%"}}/></div>
      <div className="player-dock-layout">
        <button type="button" className="player-dock-track" onClick={()=>setFullOpen(true)} aria-label="Open Now Playing" aria-haspopup="dialog" aria-expanded={fullOpen}>
          <span className="player-dock-art">{coverUrl&&!coverFailed?<img src={coverUrl} alt="" onError={()=>setCoverFailed(true)}/>:<ListMusic size={21}/>}</span>
          <span className="player-dock-meta">
            <span className="player-dock-title"><span><OverflowText text={track.title||"Untitled song"}/></span>{track.explicit&&<span className="player-dock-explicit" aria-label="Explicit">E</span>}<span className="player-dock-pure"><PureBadge compact/></span></span>
            <span className="player-dock-artist"><OverflowText text={track.artist||track.uploader_name||"Unknown artist"}/></span>
          </span>
        </button>

        <div className="player-dock-mobile-controls">
          <button type="button" className="player-dock-button player-dock-play" onClick={p.togglePlay} aria-label={playLabel}>{p.isPlaying?<Pause size={21} fill="currentColor"/>:<Play size={21} fill="currentColor"/>}</button>
          <button type="button" className="player-dock-button" onClick={p.next} aria-label="Next"><SkipForward size={21} fill="currentColor"/></button>
        </div>

        <div className="player-dock-center">
          <div className="player-dock-transport">
            <button type="button" className="player-dock-button" onClick={p.prev} aria-label="Previous"><SkipBack size={20} fill="currentColor"/></button>
            <button type="button" className="player-dock-button player-dock-play" onClick={p.togglePlay} aria-label={playLabel}>{p.isPlaying?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button>
            <button type="button" className="player-dock-button" onClick={p.next} aria-label="Next"><SkipForward size={20} fill="currentColor"/></button>
          </div>
          <div className="player-dock-seek"><PlaybackSeekSlider key={track.id} position={p.position} duration={p.duration} onSeek={p.seek}/></div>
        </div>

        <div className="player-dock-tools">
          <div className="player-dock-volume">
            <button type="button" className="player-dock-button" onClick={toggleMute} aria-label={p.muted||p.volume===0?"Unmute":"Mute"} aria-pressed={p.muted||p.volume===0}>{p.muted||p.volume===0?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
            <input type="range" min={0} max={1} step={.01} value={p.muted?0:p.volume} onChange={event=>p.setVolume(Number(event.target.value))} aria-label="Volume" aria-valuetext={Math.round((p.muted?0:p.volume)*100)+" percent"}/>
          </div>
          <button type="button" className="player-dock-button player-dock-queue" onClick={()=>setQueueOpen(true)} aria-label="Queue" aria-description={upcoming+" songs up next"} aria-expanded={queueOpen} aria-haspopup="dialog" title={upcoming+" songs up next"}><ListMusic size={20}/>{upcoming>0&&<i aria-hidden="true"/>}</button>
          <span className="player-dock-options"><TrackOptionsMenu track={track} size={19} buttonClassName="player-dock-button" /></span>
          <button type="button" className="player-dock-button player-dock-close" onClick={p.clearQueue} aria-label="Close player" title="Close player"><X size={17}/></button>
        </div>
      </div>
    </section>
    {fullOpen&&<FullScreenPlayer onClose={()=>setFullOpen(false)}/>}
    {queueOpen&&<div className="fixed inset-0 z-50"><QueuePanel open={queueOpen} onClose={()=>setQueueOpen(false)}/></div>}
  </>;
}

