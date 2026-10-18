import {useRef,useState} from "react";
import {Check,Loader2,Plus,X} from "lucide-react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import MotionGradient from "@/components/MotionGradient";
import {PUBLIC_GRADIENT_COLORS} from "@/components/BrandGradient";
import ProfileColorWheel from "./ProfileColorWheel";
import "./profile-colors.css";

const PRESETS=[
 {name:"PUBLIC",colors:[...PUBLIC_GRADIENT_COLORS]},
 {name:"Midnight",colors:["#172768","#9854ef","#56c9e2"]},
 {name:"Sunset",colors:["#f25340","#ffc179","#ae327d"]},
 {name:"Forest",colors:["#123f3c","#a9cd6b","#26a78c"]},
 {name:"Rose",colors:["#e7639a","#ffd0ac","#743e9b"]},
 {name:"Ocean",colors:["#154cb2","#5cd9dc","#453b9b"]},
 {name:"Chrome",colors:["#34465e","#e7eef4","#8eaec4"]},
 {name:"Aurora",colors:["#133c50","#68e2b5","#9164df"]},
 {name:"Ember",colors:["#68253e","#ff743f","#ffc467"]},
 {name:"Lavender",colors:["#7563d7","#edb1dc","#bfddeb"]},
 {name:"Lagoon",colors:["#12666d","#82dbb6","#f2cf86"]},
 {name:"Prism",colors:["#4059d8","#ec6bad","#ffa76e"]},
 {name:"Dune",colors:["#92604d","#edc79a","#849c91"]}
];
// Broad color pools keep every palette legible at thumbnail size without extra WebGL canvases.
const presetGradient=([a,b,c])=>
 `radial-gradient(ellipse at 12% 12%, ${b} 0%, ${b}00 64%),radial-gradient(ellipse at 90% 85%, ${c} 0%, ${c}00 68%),linear-gradient(135deg, ${a} 15%, ${a} 55%, ${c} 100%)`;
const valid=color=>/^#[0-9a-f]{6}$/i.test(color);
const normalize=text=>"#"+text.replace(/^#/,"").toLowerCase();

export default function ProfileColorPicker({coverUrl,colors,loading,value,onPreview,onSave,onClose}){
 const [draft,setDraft]=useState(()=>({mode:value.mode,colors:[...value.colors],motion:value.motion||"flow",speed:value.speed||1}));
 const [saving,setSaving]=useState(false),[error,setError]=useState("");
 const saveLock=useRef(false);
 const [activeColor,setActiveColor]=useState(0);
 const activeIndex=Math.min(activeColor,Math.max(0,draft.colors.length-1));
 const update=next=>{if(saveLock.current)return;setError("");setDraft(next);onPreview({...next,colors:next.colors.filter(valid)});};
 const customColors=draft.colors.length?draft.colors:colors.slice(0,3).length?colors.slice(0,3):PRESETS[0].colors;
 const setColors=next=>update({...draft,mode:"custom",colors:next.slice(0,3)});
 const toggle=color=>setColors(draft.mode==="custom"&&draft.colors.includes(color)?draft.colors.filter(c=>c!==color):[...(draft.mode==="custom"?draft.colors:[]),color].slice(-3));
 const preview=draft.mode==="off"?[]:draft.mode==="custom"?draft.colors.filter(valid):colors.slice(0,3);
 const invalid=draft.mode==="custom"&&(!draft.colors.length||draft.colors.some(color=>!valid(color)));
 const save=async()=>{
  if(saveLock.current||invalid)return;
  saveLock.current=true;setSaving(true);setError("");
  try{await onSave({...draft,colors:[...new Set(draft.colors.filter(valid).map(c=>c.toLowerCase()))]});onClose();}
  catch{setError("Your colors couldn’t save. Try again; your choices are still here.");}
  finally{saveLock.current=false;setSaving(false);}
 };
 return <Dialog open onOpenChange={open=>{if(!open&&!saveLock.current)onClose();}}>
  <DialogContent className="profile-palette-dialog profile-color-editor" data-public-dialog>
   <DialogHeader><DialogTitle>Your profile colors</DialogTitle><DialogDescription>Build your gradient with the color wheel, choose a palette, or follow your song.</DialogDescription></DialogHeader>
   <div className="profile-color-body">
    <div className="profile-color-preview">
     {preview.length>0&&<MotionGradient colors={preview} motion={draft.motion} speed={draft.speed} className="absolute inset-0" style={{borderRadius:"inherit",zIndex:-2}}/>}
     {coverUrl&&<img src={coverUrl} alt="" onError={event=>{event.currentTarget.style.display="none";}}/>}
     <div><strong>Make it yours</strong><span>{draft.mode==="off"?"Clean background":draft.motion==="flow"?"PUBLIC Flow · Live preview":"Still · Live preview"}</span></div>
    </div>
    <div className="profile-color-modes" role="group" aria-label="Profile background mode">
     {[["auto","Automatic"],["custom","Custom"],["off","No color"]].map(([mode,label])=><button type="button" key={mode} disabled={saving} aria-pressed={draft.mode===mode} onClick={()=>update({...draft,mode,colors:mode==="custom"?customColors:draft.colors})}>{label}</button>)}
    </div>
    <p className="profile-color-hint">{draft.mode==="auto"?(coverUrl?"Colors update with your profile song.":"Add a profile song for automatic colors, or choose Custom now."):draft.mode==="off"?"Use PUBLIC’s clean background. Your custom palette is kept.":"Your custom colors stay the same when you change your profile song."}</p>
    {draft.mode!=="custom"&&<button type="button" className="profile-color-create" disabled={saving} onClick={()=>{setActiveColor(0);setColors(customColors);}}><Plus size={16}/>Create your own palette</button>}
    {draft.mode==="custom"&&<>
     <section className="profile-color-section"><h3>Your colors <span>Tap one, then drag</span></h3><div className="profile-color-quick-stops" role="group" aria-label="Choose gradient color to edit">{draft.colors.map((color,index)=><button type="button" key={index} disabled={saving} aria-label={`Edit gradient color ${index+1}`} aria-pressed={activeIndex===index} onClick={()=>setActiveColor(index)}><span style={{background:valid(color)?color:"#777777"}}>{activeIndex===index&&<Check size={16}/>}</span><small>Color {index+1}</small></button>)}{draft.colors.length<3&&<button type="button" disabled={saving} aria-label="Add gradient color" onClick={()=>{setActiveColor(draft.colors.length);setColors([...draft.colors,PRESETS[0].colors[draft.colors.length]]);}}><span><Plus size={18}/></span><small>Add color</small></button>}</div></section>
     {draft.colors.length>0&&<ProfileColorWheel key={activeIndex} colorNumber={activeIndex+1} value={valid(draft.colors[activeIndex])?draft.colors[activeIndex]:"#777777"} disabled={saving} onChange={color=>setColors(draft.colors.map((c,i)=>i===activeIndex?color:c))}/>}
     <details className="profile-color-section profile-color-details"><summary>Hex codes &amp; remove colors</summary>
      <div className="profile-color-stops">{draft.colors.map((color,index)=><div className="profile-color-stop" key={index}>
       <button type="button" className="profile-color-wheel profile-color-select" aria-label={`Edit color ${index+1} on the wheel`} aria-pressed={activeIndex===index} disabled={saving} style={{backgroundColor:valid(color)?color:"#777777"}} onClick={()=>setActiveColor(index)}>{activeIndex===index&&<Check size={16}/>}</button>
       <label className="profile-color-hex"><span>Color {index+1}</span><input aria-label={`Color ${index+1} hex code`} spellCheck={false} autoComplete="off" maxLength={7} value={color} disabled={saving} aria-invalid={!valid(color)} onChange={event=>setColors(draft.colors.map((c,i)=>i===index?normalize(event.target.value):c))}/></label>
       <button type="button" disabled={saving} aria-label={`Remove color ${index+1}`} onClick={()=>setColors(draft.colors.filter((_,i)=>i!==index))}><X size={16}/></button>
      </div>)}</div>
      {draft.colors.some(c=>!valid(c))&&<p className="profile-color-hint" role="status">Use a six-digit hex color, such as #6948a6.</p>}
      {draft.colors.length<3&&<button type="button" className="profile-color-add" disabled={saving} onClick={()=>{setActiveColor(draft.colors.length);setColors([...draft.colors,PRESETS[0].colors[draft.colors.length]]);}}><Plus size={16}/>Add color</button>}
     </details>
     <section className="profile-color-section"><h3>Ready-made palettes</h3><div className="profile-color-presets">{PRESETS.map(preset=><button type="button" key={preset.name} disabled={saving} aria-pressed={draft.colors.join(",").toLowerCase()===preset.colors.join(",")} onClick={()=>setColors([...preset.colors])}><span className="profile-color-preset-art" style={{backgroundImage:presetGradient(preset.colors),backgroundColor:preset.colors[0]}}>{draft.colors.join(",").toLowerCase()===preset.colors.join(",")&&<span className="profile-color-preset-check"><Check size={14}/></span>}</span><span>{preset.name}</span></button>)}</div></section>
     {(colors.length>0||loading)&&<section className="profile-color-section"><h3>From your song cover</h3>{loading?<p className="profile-color-hint">Reading cover colors…</p>:<div className="profile-color-cover-swatches">{colors.map(color=><button type="button" key={color} disabled={saving} aria-label={`Use cover color ${color}`} aria-pressed={draft.colors.includes(color)} onClick={()=>toggle(color)} style={{backgroundColor:color}}>{draft.colors.includes(color)&&<Check size={16}/>}</button>)}</div>}</section>}
    </>}
    {draft.mode!=="off"&&<details className="profile-color-section profile-color-details"><summary>Movement &amp; speed</summary>
     <div className="profile-color-modes profile-motion-modes" role="group" aria-label="Gradient movement">{[["still","Still"],["flow","PUBLIC Flow"]].map(([motion,label])=><button key={motion} type="button" disabled={saving} aria-pressed={draft.motion===motion} onClick={()=>update({...draft,motion})}>{label}</button>)}</div>
     {draft.motion==="flow"&&<label className="profile-motion-speed"><span>Speed <span>{draft.speed<.75?"Slow":draft.speed>1.2?"Lively":"Gentle"}</span></span><input type="range" min=".35" max="1.6" step=".05" value={draft.speed} disabled={saving} aria-label="Gradient movement speed" onChange={event=>update({...draft,speed:Number(event.target.value)})}/></label>}
     <p className="profile-color-hint">Motion follows each viewer’s Reduce Motion setting.</p>
    </details>}
   </div>
   <footer className="profile-color-footer">
    {error&&<p role="alert">{error}</p>}
    {invalid&&<p role="status">Add at least one valid color. Check Hex codes for incomplete entries.</p>}
    <button type="button" disabled={saving} onClick={onClose} className="playlist-action">Cancel</button>
    <button type="button" disabled={saving||invalid} onClick={save} className="chrome-button">{saving&&<Loader2 size={16} className="animate-spin"/>}{saving?"Saving…":"Save colors"}</button>
   </footer>
  </DialogContent>
 </Dialog>;
}
