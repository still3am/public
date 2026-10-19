import {useEffect,useState} from "react";
import {Airplay,Bluetooth,Check,ChevronRight,Headphones,Monitor,Smartphone,Speaker,Volume2,VolumeX,RefreshCw,Loader2} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {usePlayer} from "@/context/PlayerContext";
import {useOfflineCoverUrl} from "@/hooks/useOfflineCoverUrl";
import {useCoverUrl} from "@/hooks/useCoverUrl";
import "./device-connect.css";

function DeviceConnectPanel({onClose}){
 const p=usePlayer(),{state:s,controller}=p.audioOutput;
 const [help,setHelp]=useState(false),[refreshing,setRefreshing]=useState(false),[coverFailed,setCoverFailed]=useState(false);
 const offlineCover=useOfflineCoverUrl(p.currentTrack?.id,p.currentTrack?.cover_art_url),cover=useCoverUrl(offlineCover);
 const wireless=s.remoteState==="connected",connecting=s.remoteState==="connecting";
 useEffect(()=>{controller.refresh();},[controller]);
 useEffect(()=>setCoverFailed(false),[cover]);
 const agent=navigator.userAgent;
 const thisDevice=/iPhone/.test(agent)?"This iPhone":/iPad/.test(agent)?"This iPad":/Android/.test(agent)?"This phone":"This computer";
 const DeviceIcon=/iPhone|iPad|iPod|Android/.test(agent)?Smartphone:Monitor;
 const CurrentIcon=wireless?Airplay:s.sinkId?Headphones:DeviceIcon;
 const outputName=wireless?(s.airplay?"AirPlay":"Wireless speaker"):s.sinkId?s.label:thisDevice;
 const available=s.outputs.filter(device=>device.deviceId!==s.sinkId);
 const canPick=s.airplay||s.remote||s.canChoose&&s.canRoute;
 const hasChoices=available.length>0||canPick;
 async function refresh(){setRefreshing(true);try{await controller.refresh();}finally{setRefreshing(false);}}
 const row=(icon,title,description,onClick,extra={})=>{
  const Icon=icon;
  return <button type="button" className="device-connect-row" onClick={onClick} {...extra}><span className="device-connect-icon"><Icon size={22} strokeWidth={1.7}/></span><span className="device-connect-row-text"><strong>{title}</strong><small>{description}</small></span><ChevronRight className="device-connect-chevron" size={17}/></button>;
 };
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}>
  <DialogContent className="device-connect" data-public-dialog onKeyDown={event=>{if(event.key==="Escape")event.stopPropagation();}} onTouchStart={event=>event.stopPropagation()} onTouchMove={event=>event.stopPropagation()} onTouchEnd={event=>event.stopPropagation()}>
   <div className="device-connect-handle" aria-hidden="true"/>
   <header className="device-connect-heading">
    <span className="device-connect-brand">PUBLIC. / CONNECT</span>
    <DialogTitle className="device-connect-title">Where to listen.</DialogTitle>
    <DialogDescription className="device-connect-subtitle">Choose where your music plays.</DialogDescription>
   </header>
   <section className="device-connect-current" aria-label="Current audio output">
    <span className="device-connect-eyebrow">CURRENT OUTPUT</span>
    <div className="device-connect-current-main">
     <span className="device-connect-current-icon"><CurrentIcon size={29} strokeWidth={1.5}/></span>
     <div className="device-connect-row-text"><strong>{outputName}</strong><small>{connecting?"Connecting…":wireless?"Wireless playback":s.sinkId?"Selected speaker":"Uses your system’s audio output"}</small></div>
     <Check size={19} aria-label="Selected"/>
    </div>
    <div className="device-connect-now">
     <div className="device-connect-cover">{cover&&!coverFailed?<img src={cover} alt="" onError={()=>setCoverFailed(true)}/>:<Speaker size={20}/>}</div>
     <div className="device-connect-row-text"><strong>{p.currentTrack?.title||"Ready to listen"}</strong><small>{p.currentTrack?.artist||p.currentTrack?.uploader_name||"Choose a song on Public"}</small></div>
     <span className={"device-connect-levels "+(p.isPlaying?"is-playing":"")} aria-label={p.isPlaying?"Playing":"Paused"}><i/><i/><i/></span>
    </div>
   </section>
   <section className="device-connect-options" aria-label="Connection options">
    <div className="device-connect-section-title"><h3>{hasChoices?"Listen on":"Connect a speaker"}</h3><button type="button" onClick={refresh} disabled={refreshing||s.busy} aria-label="Refresh available outputs" title="Refresh outputs"><RefreshCw size={16} className={refreshing?"animate-spin":""}/></button></div>
    <div className="device-connect-list">
     {s.sinkId&&s.canRoute&&row(DeviceIcon,thisDevice,"Return to system audio",()=>controller.select({deviceId:"",label:"System default"}),{disabled:s.busy})}
     {available.map(device=><div key={device.deviceId}>{row(Headphones,device.label,"Available audio output",()=>controller.select(device),{disabled:s.busy||!s.canRoute})}</div>)}
     {(s.airplay||s.remote)&&row(Airplay,s.airplay?"AirPlay":"Wireless playback",wireless?"Change your wireless device":connecting?"Connecting…":"Choose a speaker or TV",()=>controller.wireless(),{disabled:s.busy})}
     {s.canChoose&&s.canRoute&&row(Speaker,"Choose a speaker","Show available audio devices",()=>controller.choose(),{disabled:s.busy})}
     {row(Bluetooth,"Bluetooth & system audio","Connect headphones or a speaker",()=>setHelp(value=>!value),{"aria-expanded":help,"aria-controls":"public-connect-help"})}
    </div>
    {help&&<div id="public-connect-help" className="device-connect-help"><p>Pair your speaker in Bluetooth settings, then select it as your device’s audio output.</p><ol>{/iPhone|iPad|iPod/.test(agent)?<><li>Open Control Center.</li><li>Expand Now Playing and tap the AirPlay icon.</li><li>Choose your headphones, speaker, or TV.</li></>:<><li>Open your device’s sound settings.</li><li>Choose your speaker or headphones as the output.</li><li>Return to Public and press play.</li></>}</ol></div>}
    {!hasChoices&&!help&&<p className="device-connect-note">Public follows the speaker selected in your device’s sound settings.</p>}
   </section>
   {(s.error||s.busy)&&<div className="device-connect-status" role="status" aria-live="polite">{s.busy&&<Loader2 size={15} className="animate-spin"/>}<span>{s.error||"Opening device picker…"}</span></div>}
   <section className="device-connect-volume" aria-label="Playback volume">
    <div><span>Volume</span><small>{Math.round((p.muted?0:p.volume)*100)}%</small></div>
    <div className="device-connect-volume-controls">
     <button type="button" onClick={()=>p.setMuted(!p.muted)} aria-label={p.muted?"Unmute":"Mute"} aria-pressed={p.muted}>{p.muted||p.volume===0?<VolumeX size={21}/>:<Volume2 size={21}/>}</button>
     <input type="range" min="0" max="1" step="0.01" value={p.muted?0:p.volume} aria-label="Playback volume" style={{"--connect-volume":Math.round((p.muted?0:p.volume)*100)+"%"}} onPointerDown={()=>p.prepareVolumeControl?.()} onChange={event=>p.setVolume(Number(event.target.value))}/>
    </div>
    <p>Wireless volume can also be adjusted on the speaker.</p>
   </section>
  </DialogContent>
 </Dialog>;
}
export default function DeviceConnect({label=false,className=""}){
 const p=usePlayer(),[open,setOpen]=useState(false);
 const connected=!!p.audioOutput.state.sinkId||p.audioOutput.state.remoteState==="connected";
 return <><button type="button" onClick={()=>setOpen(true)} aria-label={connected?"Connected output · change device":"Connect to a device"} aria-haspopup="dialog" aria-expanded={open} title="Connect to a device" className={"device-connect-trigger "+(connected?"is-connected ":"")+className}><Airplay size={20}/>{connected&&<span className="device-connect-trigger-dot" aria-hidden="true"/>}{label&&<span className="hidden">{connected?"Connected":"Connect to a device"}</span>}</button>{open&&<DeviceConnectPanel onClose={()=>setOpen(false)}/>}</>;
}
