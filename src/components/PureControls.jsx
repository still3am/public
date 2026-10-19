import {useEffect} from "react";
import {usePlayer} from "@/context/PlayerContext";
import {PURE_PRESETS,DEFAULT_PURE} from "@/lib/pureAudio";
import {AudioLines,RotateCcw} from "lucide-react";
import "./pure-controls.css";

export default function PureControls({compact=false}){
 const p=usePlayer(),settings=p.pure||DEFAULT_PURE,enabled=settings.enabled,available=!p.pureSuspended,active=enabled&&available;
 const selected=PURE_PRESETS.find(preset=>["clarity","bass","balance"].every(key=>settings[key]===preset[key]));
 useEffect(()=>()=>p.comparePure(false),[p.comparePure]);
 const update=values=>{p.comparePure(false);return p.setPureValues(values);};
 const release=()=>p.comparePure(false);
 const status=p.pureSuspended?"Paused for wireless playback":p.pureComparing?"Comparing · PURE bypassed":active?(selected?.name||"Custom tuning"):"Off · enable to start";
 return <section aria-label="PURE sound enhancement" className={"pure-controls "+(compact?"is-compact":"")}>
  <div className="pure-control-header">
   <div><h3><AudioLines size={18} strokeWidth={1.6}/>PURE</h3><p role="status"><span className={"pure-status-dot "+(active&&!p.pureComparing?"is-active":"")}/>{status}</p></div>
   <button type="button" role="switch" aria-label="Enable PURE" aria-checked={enabled} disabled={!available&&!enabled} onClick={()=>update({enabled:!enabled})} className={"pure-switch "+(enabled?"is-on":"")}><span/></button>
  </div>
  <div role="group" aria-label="PURE sound presets" className="pure-presets">{PURE_PRESETS.map(preset=><button key={preset.name} type="button" disabled={!available||p.pureComparing} aria-pressed={active&&selected?.name===preset.name} onClick={()=>update({...preset,enabled:true})}><strong>{preset.name}</strong>{!compact&&<small>{preset.description}</small>}</button>)}</div>
  <div className="pure-tuning">{[
   ["clarity","Clarity","Bring voices forward without a sharp edge."],
   ["bass","Body","Give the low end a little more weight."],
   ["balance","Balance","Gently soften louder peaks."]
  ].map(([key,title,description])=><label key={key} className={!active?"is-disabled":""}>
   <span className="pure-slider-label"><span>{title}</span><output>{settings[key]}<small>%</small></output></span>
   <input type="range" min="0" max="100" step="1" aria-label={"PURE "+title.toLowerCase()} aria-valuetext={settings[key]+" percent"} value={settings[key]} disabled={!active||p.pureComparing} style={{"--pure-fill":settings[key]+"%"}} onChange={event=>update({[key]:Number(event.target.value)})}/>
   {!compact&&<span className="pure-slider-hint">{description}</span>}
  </label>)}</div>
  <div className="pure-actions">
   <button type="button" className="pure-compare" disabled={!active} onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture?.(event.pointerId);p.comparePure(true);}} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onBlur={release} onKeyDown={event=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();if(!event.repeat)p.comparePure(true);}}} onKeyUp={event=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();release();}}} aria-pressed={!!p.pureComparing}>{p.pureComparing?"Release to hear PURE":"Hold to compare"}</button>
   <button type="button" className="pure-reset" disabled={!available} onClick={()=>update({...DEFAULT_PURE,enabled})} aria-label="Reset PURE tuning"><RotateCcw size={13}/><span>Reset</span></button>
  </div>
  {p.pureError&&<p role="status" className="pure-error">{p.pureError}</p>}
  {!compact&&<p className="pure-footnote">Saved on this device. PURE shapes playback without changing your uploaded files.</p>}
 </section>;
}
