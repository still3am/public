import {base44} from "@/api/base44Client";
import {useAuth} from "@/lib/AuthContext";
import {useEffect,useState,useRef} from "react";
import {usePlayer} from "@/context/PlayerContext";
import {PURE_PRESETS,DEFAULT_PURE} from "@/lib/pureAudio";
import {AudioLines,RotateCcw,ChevronDown} from "lucide-react";
import "./pure-controls.css";

export default function PureControls({compact=false}){
 const {user}=useAuth(),[presets,setPresets]=useState([]),[presetName,setPresetName]=useState(""),[presetError,setPresetError]=useState(""),[saving,setSaving]=useState(false),presetLock=useRef(false);
 useEffect(()=>{let alive=true;setPresets([]);if(user?.id)base44.entities.PurePreset.filter({created_by_id:user.id},"-created_date",50).then(rows=>{if(alive)setPresets(Array.isArray(rows)?rows:rows?.items||[]);}).catch(()=>{if(alive)setPresetError("Saved presets couldn’t load.");});return()=>{alive=false;};},[user?.id]);
 const p=usePlayer(),settings=p.pure||DEFAULT_PURE,enabled=settings.enabled,available=!p.pureSuspended,active=enabled&&available;
 const selected=PURE_PRESETS.find(preset=>["clarity","bass","balance"].every(key=>settings[key]===preset[key]));
 useEffect(()=>{const release=()=>p.comparePure(false),visibility=()=>{if(document.visibilityState==="hidden")release();};window.addEventListener("blur",release);document.addEventListener("visibilitychange",visibility);return()=>{window.removeEventListener("blur",release);document.removeEventListener("visibilitychange",visibility);release();};},[p.comparePure]);
 const update=values=>{p.comparePure(false);return p.setPureValues(values);};
 const release=()=>p.comparePure(false);
 const canCompare=active&&!!p.currentTrack&&p.isPlaying;
 useEffect(()=>{if(!canCompare)p.comparePure(false);},[canCompare,p.comparePure]);
 async function savePreset(){
  if(!user?.id||!presetName.trim()||presetLock.current)return;presetLock.current=true;setSaving(true);setPresetError("");
  try{const row=await base44.entities.PurePreset.create({name:presetName.trim().slice(0,40),clarity:settings.clarity,bass:settings.bass,balance:settings.balance});setPresets(rows=>[row,...rows]);setPresetName("");}
  catch{setPresetError("Your preset couldn’t save. Please retry.");}finally{presetLock.current=false;setSaving(false);}
 }
 async function removePreset(id){
  if(presetLock.current)return;presetLock.current=true;setSaving(true);
  try{await base44.entities.PurePreset.delete(id);setPresets(rows=>rows.filter(p=>p.id!==id));}catch{setPresetError("Your preset couldn’t be removed.");}finally{presetLock.current=false;setSaving(false);}
 }
 const status=p.pureSuspended?"Paused for wireless playback":p.pureComparing?"Comparing without PURE":"";
 return <section onTouchStart={event=>event.stopPropagation()} onTouchMove={event=>event.stopPropagation()} onTouchEnd={event=>event.stopPropagation()} aria-label="PURE sound enhancement" className={"pure-controls "+(compact?"is-compact":"")}>
  <div className="pure-control-header">
   <div><h3><AudioLines size={18} strokeWidth={1.6}/>{compact?"PURE":"Sound profile"}</h3>{status&&<p role="status">{status}</p>}</div>
   <label className={"pure-switch "+(enabled?"is-on":"")}><input type="checkbox" role="switch" aria-label="Enable PURE" checked={enabled} disabled={!available&&!enabled} onChange={event=>update({enabled:event.target.checked})}/><span className="pure-switch-track" aria-hidden="true"><span className="pure-switch-thumb"/></span></label>
  </div>
  <div role="group" aria-label="PURE sound presets" className="pure-presets">{PURE_PRESETS.map(preset=><button key={preset.name} type="button" disabled={!available||p.pureComparing} aria-pressed={active&&selected?.name===preset.name} onClick={()=>update({...preset,enabled:true})}><strong>{preset.name}</strong></button>)}</div>
  <details className="pure-adjustments"><summary>Fine-tune <ChevronDown size={15}/></summary>
  <div className="pure-tuning">{[
   ["clarity","Clarity","Bring voices forward without a sharp edge."],
   ["bass","Body","Give the low end a little more weight."],
   ["balance","Balance","Gently soften louder peaks."]
  ].map(([key,title,description])=><label key={key} className={!active?"is-disabled":""}>
   <span className="pure-slider-label"><span>{title}</span><output>{settings[key]}<small>%</small></output></span>
   <input type="range" min="0" max="100" step="1" aria-label={"PURE "+title.toLowerCase()} aria-valuetext={settings[key]+" percent"} value={settings[key]} disabled={!active||p.pureComparing} style={{"--pure-fill":settings[key]+"%"}} onChange={event=>update({[key]:Number(event.target.value)})}/>
   {!compact&&<span className="pure-slider-hint">{description}</span>}
  </label>)}</div>
  <button type="button" className="pure-reset" disabled={!available} onClick={()=>update({...DEFAULT_PURE,enabled})} aria-label="Reset PURE tuning"><RotateCcw size={13}/><span>Reset tuning</span></button>
  {user&&<div className="mt-4 border-t pt-4 space-y-2"><p className="text-xs font-semibold">Your presets</p>{presets.map(preset=><div key={preset.id} className="flex items-center gap-2"><button type="button" disabled={saving||!available||p.pureComparing} className="flex-1 text-left text-xs min-h-11 px-3 border rounded-xl" onClick={()=>update({...preset,enabled:true})}>{preset.name}</button><button type="button" disabled={saving} className="min-h-11 px-3 text-xs opacity-60" onClick={()=>removePreset(preset.id)} aria-label={"Delete "+preset.name}>Remove</button></div>)}<form className="flex gap-2" onSubmit={event=>{event.preventDefault();savePreset();}}><input aria-label="Preset name" placeholder="Name this sound" maxLength={40} value={presetName} onChange={e=>setPresetName(e.target.value)} className="min-w-0 flex-1 bg-transparent border rounded-xl px-3 text-xs min-h-11"/><button type="submit" disabled={saving||!presetName.trim()} className="text-xs font-semibold px-3">{saving?"Saving…":"Save"}</button></form></div>}
  {presetError&&<p className="text-xs mt-3" role="status">{presetError}</p>}
  </details>
  {active&&!!p.currentTrack&&<div className="pure-actions">
   <button type="button" className="pure-compare" disabled={!canCompare} onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture?.(event.pointerId);p.comparePure(true);}} onClick={event=>{if(event.detail===0)p.comparePure(!p.pureComparing);}} aria-label={p.pureComparing?"Restore PURE":"Compare without PURE. Hold or activate to compare"} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onBlur={release} onKeyDown={event=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();if(!event.repeat)p.comparePure(true);}}} onKeyUp={event=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();release();}}} aria-pressed={!!p.pureComparing}>{p.pureComparing?"Release to hear PURE":active&&!p.isPlaying?"Play to compare":"Hold to compare"}</button>
  </div>}
  {canCompare&&<p className="text-[10px] text-center opacity-60 mt-2">Comparison matches the recent output level for a fairer listen.</p>}
  {p.pureError&&<p role="status" className="pure-error">{p.pureError}</p>}

 </section>;
}
