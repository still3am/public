import PureControls from "@/components/PureControls";
import {useEffect,useState} from "react";
import {AudioLines,Check,Loader2} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {usePlayer} from "@/context/PlayerContext";
import {inspectAudioHeader,inspectAudioSource,qualityDescription,AUDIO_HEADER_LIMIT} from "@/lib/audioQuality";

export function UploadAudioQuality({file}){
 const [info,setInfo]=useState(null);
 useEffect(()=>{
  let alive=true;setInfo(null);
  file?.slice(0,AUDIO_HEADER_LIMIT).arrayBuffer().then(buffer=>{if(alive)setInfo(inspectAudioHeader(buffer));}).catch(()=>{});
  return()=>{alive=false;};
 },[file]);
 if(!info||info.kind!=="lossless")return null;
 return <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><AudioLines size={14}/><span>Lossless source · {qualityDescription(info)}</span></p>;
}
export default function AudioQuality(){
 const p=usePlayer(),trackId=p.currentTrack?.id,source=p.getAudioQualitySource?.(),url=source?.id===trackId?source?.url:"";
 const [open,setOpen]=useState(false),[retry,setRetry]=useState(0),[result,setResult]=useState(null);
 useEffect(()=>{
  if(!url)return;
  const controller=new AbortController();let alive=true;
  setResult({url,status:"checking"});
  inspectAudioSource(url,{signal:controller.signal}).then(info=>{
   if(alive)setResult({url,status:"ready",info});
  }).catch(error=>{if(alive&&error?.name!=="AbortError")setResult({url,status:"unavailable"});});
  return()=>{alive=false;controller.abort();};
 },[url,retry,trackId]);
 const current=result?.url===url?result:null,info=current?.info,lossless=info?.kind==="lossless",checking=current?.status==="checking";
 return <><button type="button" onClick={()=>setOpen(true)} className="inline-flex items-center gap-1.5 min-h-9 text-[10px] uppercase tracking-[.12em] opacity-70 hover:opacity-100 transition rounded-full focus-visible:outline focus-visible:outline-2 px-1" aria-label="PURE sound controls and audio quality" aria-haspopup="dialog" aria-expanded={open}><AudioLines size={14}/>{p.pureComparing?"PURE · Compare":p.pure?.enabled&&!p.pureSuspended?"PURE · On":"PURE"}</button>
 {open&&<Dialog open onOpenChange={value=>{if(!value)setOpen(false);}}><DialogContent className="pure-dialog" data-public-dialog onKeyDown={event=>{if(event.key==="Escape")event.stopPropagation();}} onTouchStart={event=>event.stopPropagation()} onTouchMove={event=>event.stopPropagation()} onTouchEnd={event=>event.stopPropagation()}>
  <span className="text-[9px] tracking-[.2em] font-semibold text-muted-foreground">SOUND, YOUR WAY</span>
  <DialogTitle className="pure-dialog-title">PURE</DialogTitle>
  <DialogDescription>Fine-tune the way your music feels.</DialogDescription>
  <PureControls/>
  <details className="pure-source-details"><summary>Source audio <span>{lossless?"Lossless":info?.codec||"Details"}</span></summary>
  <div className="mt-3 text-sm">
   {checking?<span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin"/>Checking source format…</span>:<><p className="font-semibold flex items-center gap-2">{lossless&&<Check size={16}/>} {qualityDescription(info)}</p><p className="text-xs text-muted-foreground mt-2">{lossless?"Identified from the audio header. This describes the file format, not the recording’s mastering history.":info?.kind==="lossy"?"This source uses lossy compression. PURE can still shape its playback.":"This source’s encoding could not be identified. It has not been labeled lossless."}</p></>}
  </div>
  {lossless&&<dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-muted-foreground">Bit depth</dt><dd className="font-semibold mt-1">{info.bitDepth}-bit</dd></div><div><dt className="text-xs text-muted-foreground">Source sample rate</dt><dd className="font-semibold mt-1">{info.sampleRate.toLocaleString()} Hz</dd></div></dl>}
  <p className="text-xs leading-relaxed text-muted-foreground">The browser, sound effects, volume processing, Bluetooth, and your output device can change what reaches your ears. A lossless source does not guarantee bit-perfect output.{source?.outputSampleRate?" The current audio engine runs at "+source.outputSampleRate.toLocaleString()+" Hz.":""}</p>
  <p>PURE enhances playback; it does not restore detail removed by compression.</p>
  {!checking&&url&&<button type="button" onClick={()=>setRetry(value=>value+1)} className="min-h-11 mt-3 px-4 border rounded-full text-xs font-semibold">Check source again</button>}
  </details>
 </DialogContent></Dialog>}
 </>;
}
