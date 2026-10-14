import {useEffect,useState} from "react";
import {usePlayer} from "@/context/PlayerContext";
import {Video,X} from "lucide-react";
export default function MusicVideoPicker({file,onChange,disabled=false,existing=false,onRemoveExisting}){
 const p=usePlayer();
 const [notice,setNotice]=useState("");
 const [preview,setPreview]=useState("");
 useEffect(()=>{if(!file){setPreview("");return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 return <div className="music-video-picker rounded-xl border border-border p-3">
  <div className="flex items-center gap-2 mb-1"><Video size={16}/><span className="text-sm font-semibold">Music video</span><span className="text-xs text-muted-foreground">Optional</span></div>
  <p className="text-xs text-muted-foreground mb-3">Attach an MP4 or WebM, up to 100 MB.</p>
  {preview&&<video src={preview} onPlay={()=>{if(p.isPlaying)p.togglePlay();}} controls playsInline preload="metadata" className="w-full aspect-video rounded-lg bg-black mb-3"/>}
  {(file||existing)&&<div className="flex items-center gap-2 mb-2"><span className="text-xs flex-1 min-w-0 truncate">{file?.name||"Video attached"}</span><button type="button" disabled={disabled} className="w-11 h-11 grid place-items-center rounded-full" aria-label="Remove music video" onClick={()=>{onChange(null);if(existing)onRemoveExisting?.();setNotice("");}}><X size={16}/></button></div>}
  <label className={"inline-flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-semibold cursor-pointer "+(disabled?"opacity-50 pointer-events-none":"")}>
   <Video size={14}/>{file||existing?"Replace video":"Choose video"}
   <input type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={disabled} className="sr-only" aria-label="Choose music video" onChange={event=>{const selected=event.target.files?.[0];event.target.value="";if(!selected)return;if(!/\.(mp4|webm)$/i.test(selected.name)||selected.size>100*1024*1024||selected.size===0){setNotice("Choose an MP4 or WebM file under 100 MB.");return;}setNotice("");onChange(selected);}}/>
  </label>
  {notice&&<p role="status" className="text-xs text-muted-foreground mt-2">{notice}</p>}
 </div>;
}
