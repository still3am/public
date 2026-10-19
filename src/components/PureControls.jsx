import {usePlayer} from "@/context/PlayerContext";
import {PURE_PRESETS,DEFAULT_PURE} from "@/lib/pureAudio";
import {Sparkles,RotateCcw} from "lucide-react";

export default function PureControls({compact=false}){
 const p=usePlayer(),settings=p.pure||DEFAULT_PURE,active=settings.enabled&&!p.pureSuspended;
 const update=values=>p.setPureValues(values);
 return <section aria-label="PUBLIC Pure sound enhancement" className={"rounded-2xl border border-current/10 p-4 "+(compact?"mb-5":"")}>
  <div className="flex items-center justify-between gap-4">
   <div><h3 className="font-semibold tracking-tight flex items-center gap-2"><Sparkles size={16}/>PUBLIC. Pure</h3><p className="text-[11px] opacity-60 mt-1">{p.pureSuspended?"Paused for wireless playback":active?"Sound enhancement is on":"Your original sound, unchanged by Pure"}</p></div>
   <button type="button" role="switch" aria-label="Enable PUBLIC Pure" aria-checked={active} disabled={p.pureSuspended} onClick={()=>update({enabled:!settings.enabled})} className={"relative w-12 h-7 rounded-full shrink-0 transition-colors disabled:opacity-40 "+(active?"bg-foreground text-background":"bg-foreground/15 text-foreground")}><span className={"absolute top-1 w-5 h-5 rounded-full transition-transform "+(active?"left-1 translate-x-5 bg-background":"left-1 bg-foreground")}/></button>
  </div>
  <div role="group" aria-label="Pure sound presets" className="grid grid-cols-3 gap-2 mt-5">{PURE_PRESETS.map(preset=>{
   const selected=active&&["clarity","bass","balance"].every(key=>settings[key]===preset[key]);
   return <button key={preset.name} type="button" disabled={p.pureSuspended} aria-pressed={selected} onClick={()=>update({...preset,enabled:true})} className={"min-h-11 rounded-full text-xs font-semibold border border-current/10 transition disabled:opacity-40 "+(selected?"bg-foreground text-background":"hover:bg-foreground/5")}>{preset.name}</button>;
  })}</div>
  <div className="mt-5 space-y-3">{[
   ["clarity","Vocal clarity","Lift presence and reduce muddy low mids."],
   ["bass","Bass control","Add a gentle low-frequency lift."],
   ["balance","Volume balance","Soften louder peaks with gentle compression."]
  ].map(([key,title,description])=><label key={key} className={"block "+(!active?"opacity-45":"")}><span className="flex justify-between items-center gap-3 text-xs font-semibold"><span>{title}</span><span className="font-mono tabular-nums">{settings[key]}%</span></span><input type="range" min="0" max="100" step="1" aria-label={title} aria-valuetext={settings[key]+" percent"} value={settings[key]} disabled={!active} onChange={event=>update({[key]:Number(event.target.value)})} className="w-full h-9 accent-current cursor-pointer disabled:cursor-default"/>{!compact&&<span className="block text-[10px] opacity-60 -mt-1">{description}</span>}</label>)}</div>
  <div className="flex items-center justify-between gap-3 mt-4">
   <button type="button" disabled={p.pureSuspended} onClick={()=>update({enabled:!settings.enabled})} className="min-h-11 px-3 border border-current/15 rounded-full text-xs font-semibold disabled:opacity-40">{active?"Hear without Pure":"Hear with Pure"}</button>
   <button type="button" onClick={()=>update({...DEFAULT_PURE})} className="min-h-11 px-2 inline-flex gap-1.5 items-center text-[11px] opacity-60 hover:opacity-100"><RotateCcw size={12}/>Reset</button>
  </div>
  {p.pureError&&<p role="status" className="text-xs mt-3">{p.pureError}</p>}
  {!compact&&<p className="text-[10px] leading-relaxed opacity-60 mt-3">Works with existing songs, including MP3 and AAC, while they play in this browser. Settings are saved on this device. Pure shapes sound; it doesn’t restore missing audio detail or convert a song to lossless.</p>}
 </section>;
}
