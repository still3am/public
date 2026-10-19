import {useEffect,useState} from "react";
import {Airplay,Bluetooth,Check,ChevronRight,Headphones,Monitor,Smartphone,Speaker,Volume2,VolumeX} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {usePlayer} from "@/context/PlayerContext";
import "./device-connect.css";

function DeviceConnectPanel({onClose}){
 const p=usePlayer(),{state:s,controller}=p.audioOutput;
 const [help,setHelp]=useState(false);
 const wireless=s.remoteState==="connected",connecting=s.remoteState==="connecting";
 useEffect(()=>{controller.refresh();},[controller]);
 const thisDevice=/iPhone|iPad|iPod|Android/.test(navigator.userAgent)?"This phone or tablet":"This computer";
 const DeviceIcon=/iPhone|iPad|iPod|Android/.test(navigator.userAgent)?Smartphone:Monitor;
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}>
  <DialogContent className="device-connect" data-public-dialog>
   <div className="device-connect-heading">
    <span className="device-connect-brand">PUBLIC.</span>
    <div className="device-connect-art" aria-hidden="true"><Monitor strokeWidth={1.25}/><Speaker strokeWidth={1.25}/><Smartphone strokeWidth={1.25}/></div>
    <DialogTitle className="device-connect-title">Connect to a device</DialogTitle>
    <DialogDescription className="device-connect-subtitle">Your music. Wherever you listen.</DialogDescription>
   </div>
   <div className="device-connect-list" aria-label="Audio outputs">
    <button type="button" className="device-connect-row" disabled={s.busy||(!s.canRoute&&!wireless)} onClick={()=>wireless?controller.wireless():controller.select({deviceId:"",label:"System default"})}>
     <span className="device-connect-icon"><DeviceIcon size={25}/></span>
     <span className="device-connect-row-text"><strong>{thisDevice}</strong><small>{!s.sinkId&&!wireless?"Playing through your system audio":"System default output"}</small></span>
     {!s.sinkId&&!wireless&&<Check size={20} aria-label="Selected"/>}
    </button>
    {s.sinkId&&!s.outputs.some(d=>d.deviceId===s.sinkId)&&<div className="device-connect-row"><span className="device-connect-icon"><Headphones size={25}/></span><span className="device-connect-row-text"><strong>{s.label}</strong><small>Selected output</small></span><Check size={20}/></div>}
    {s.outputs.map(device=><button type="button" className="device-connect-row" key={device.deviceId} disabled={s.busy||!s.canRoute} onClick={()=>controller.select(device)}>
     <span className="device-connect-icon"><Headphones size={25}/></span><span className="device-connect-row-text"><strong>{device.label}</strong><small>{s.sinkId===device.deviceId?"Selected output":"Available speaker"}</small></span>{s.sinkId===device.deviceId?<Check size={20} aria-label="Selected"/>:<ChevronRight size={18}/>}
    </button>)}
    {(s.airplay||s.remote)&&<button type="button" className="device-connect-row" disabled={s.busy} onClick={()=>controller.wireless()}>
     <span className="device-connect-icon"><Airplay size={25}/></span><span className="device-connect-row-text"><strong>{s.airplay?"AirPlay":"Wireless playback"}</strong><small>{wireless?"Connected · tap to change":connecting?"Connecting…":"Choose a speaker or TV"}</small></span>{wireless?<Check size={20}/>:<ChevronRight size={18}/>}
    </button>}
    {s.canChoose&&s.canRoute&&<button type="button" className="device-connect-row" disabled={s.busy} onClick={()=>controller.choose()}>
     <span className="device-connect-icon"><Speaker size={25}/></span><span className="device-connect-row-text"><strong>Choose another speaker</strong><small>Open your browser’s device picker</small></span><ChevronRight size={18}/>
    </button>}
    <button type="button" className="device-connect-row" aria-expanded={help} onClick={()=>setHelp(value=>!value)}>
     <span className="device-connect-icon"><Bluetooth size={25}/></span><span className="device-connect-row-text"><strong>Bluetooth & other devices</strong><small>Connect using your device’s audio controls</small></span><ChevronRight size={18} className={help?"rotate-90":""}/>
    </button>
   </div>
   {help&&<div className="device-connect-help"><p>Pair your speaker or headphones in Bluetooth settings. Public plays through the audio output selected on your device.</p><p>On iPhone or iPad, open Control Center, expand Now Playing, then tap the AirPlay icon. On a computer, choose an output in sound settings.</p></div>}
   {!s.airplay&&!s.remote&&!s.canChoose&&<p className="device-connect-note">Choose your speaker in system sound settings. This browser doesn’t provide an in-app device picker.</p>}
   <p className="device-connect-status" role="status" aria-live="polite">{s.error||(s.busy?"Opening connection…":"")}</p>
   <div className="device-connect-volume">
    <div><span>Volume</span><small>{Math.round((p.muted?0:p.volume)*100)}%</small></div>
    <div className="device-connect-volume-controls">
     <button type="button" onClick={()=>p.setMuted(!p.muted)} aria-label={p.muted?"Unmute":"Mute"} aria-pressed={p.muted}>{p.muted||p.volume===0?<VolumeX size={22}/>:<Volume2 size={22}/>}</button>
     <input type="range" min="0" max="1" step="0.01" value={p.muted?0:p.volume} aria-label="Playback volume" onPointerDown={()=>p.prepareVolumeControl?.()} onChange={event=>p.setVolume(Number(event.target.value))}/>
    </div>
    <p>For wireless speakers, volume may also be controlled on the device.</p>
   </div>
  </DialogContent>
 </Dialog>;
}

export default function DeviceConnect({label=false,className=""}){
 const p=usePlayer(),[open,setOpen]=useState(false);
 const connected=!!p.audioOutput.state.sinkId||p.audioOutput.state.remoteState==="connected";
 return <><button type="button" onClick={()=>setOpen(true)} aria-label="Connect to a device" aria-haspopup="dialog" aria-expanded={open} title="Connect to a device" className={"device-connect-trigger "+(connected?"is-connected ":"")+className}><Airplay size={20}/>{label&&<span>{connected?"Connected":"Connect to a device"}</span>}</button>{open&&<DeviceConnectPanel onClose={()=>setOpen(false)}/>}</>;
}
