import {useRef,useState} from "react";
import {Check,Loader2,Plus,X} from "lucide-react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {profileGradient} from "@/hooks/useCoverPalette";
import MotionGradient from "@/components/MotionGradient";
import "./profile-colors.css";

const PRESETS=[
 {name:"Midnight",colors:["#253b80","#6948a6","#182641"]},
 {name:"Sunset",colors:["#b44435","#bd7545","#67416c"]},
 {name:"Forest",colors:["#195748","#56866a","#243f50"]},
 {name:"Rose",colors:["#a94572","#7a426d","#3d3b70"]},
 {name:"Ocean",colors:["#186c9b","#258786","#263e79"]},
 {name:"Chrome",colors:["#777f8e","#bac3cc","#505a6e"]}
];
const valid=color=>/^#[0-9a-f]{6}$/i.test(color);
const normalize=text=>"#"+text.replace(/^#/,"").toLowerCase();

export default function ProfileColorPicker({coverUrl,colors,loading,value,onPreview,onSave,onClose}){
 const [draft,setDraft]=useState(()=>({mode:value.mode,colors:[...value.colors],motion:value.motion||"flow",speed:value.speed||1}));
 const [saving,setSaving]=useState(false),[error,setError]=useState("");
 const saveLock=useRef(false);
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
   <DialogHeader><DialogTitle>Your profile colors</DialogTitle><DialogDescription>Pick any colors, try a palette, or follow your profile song.</DialogDescription></DialogHeader>
   <div className="profile-color-body">
    <div className="profile-color-preview">
     {preview.length>0&&<MotionGradient colors={preview} motion={draft.motion} speed={draft.speed} className="absolute inset-0" style={{borderRadius:"inherit",zIndex:-2}}/>}
     {coverUrl&&<img src={coverUrl} alt="" onError={event=>{event.currentTarget.style.display="none";}}/>}
     <div><strong>Make it yours</strong><span>Live profile preview</span></div>
    </div>
    <div className="profile-color-modes" role="group" aria-label="Profile background mode">
     {[["auto","Automatic"],["custom","Custom"],["off","No color"]].map(([mode,label])=><button type="button" key={mode} disabled={saving} aria-pressed={draft.mode===mode} onClick={()=>update({...draft,mode,colors:mode==="custom"?customColors:draft.colors})}>{label}</button>)}
    </div>
    <p className="profile-color-hint">{draft.mode==="auto"?(coverUrl?"Colors update with your profile song.":"Add a profile song for automatic colors, or choose Custom now."):draft.mode==="off"?"Use PUBLIC’s clean background. Your custom palette is kept.":"Your custom colors stay the same when you change your profile song."}</p>
    {draft.mode!=="off"&&<section className="profile-color-section"><h3>Movement</h3>
     <div className="profile-color-modes profile-motion-modes" role="group" aria-label="Gradient movement">{[["still","Still"],["flow","Flowing"]].map(([motion,label])=><button key={motion} type="button" disabled={saving} aria-pressed={draft.motion===motion} onClick={()=>update({...draft,motion})}>{label}</button>)}</div>
     {draft.motion==="flow"&&<label className="profile-motion-speed"><span>Speed <span>{draft.speed<.75?"Slow":draft.speed>1.2?"Lively":"Gentle"}</span></span><input type="range" min=".35" max="1.6" step=".05" value={draft.speed} disabled={saving} aria-label="Gradient movement speed" onChange={event=>update({...draft,speed:Number(event.target.value)})}/></label>}
     <p className="profile-color-hint">Motion follows each viewer’s Reduce Motion setting.</p>
    </section>}
    {draft.mode==="custom"&&<>
     <section className="profile-color-section"><h3>Your palette <span>Up to 3 colors</span></h3>
      <div className="profile-color-stops">{draft.colors.map((color,index)=><div className="profile-color-stop" key={index}>
       <label className="profile-color-wheel" style={{backgroundColor:valid(color)?color:"#777777"}}>
        <input type="color" aria-label={`Pick color ${index+1}`} disabled={saving} value={valid(color)?color:"#777777"} onChange={event=>setColors(draft.colors.map((c,i)=>i===index?event.target.value:c))}/>
       </label>
       <label className="profile-color-hex"><span>Color {index+1}</span><input aria-label={`Color ${index+1} hex code`} spellCheck={false} autoComplete="off" maxLength={7} value={color} disabled={saving} aria-invalid={!valid(color)} onChange={event=>setColors(draft.colors.map((c,i)=>i===index?normalize(event.target.value):c))}/></label>
       <button type="button" disabled={saving} aria-label={`Remove color ${index+1}`} onClick={()=>setColors(draft.colors.filter((_,i)=>i!==index))}><X size={16}/></button>
      </div>)}</div>
      {draft.colors.some(c=>!valid(c))&&<p className="profile-color-hint" role="status">Use a six-digit hex color, such as #6948a6.</p>}
      {draft.colors.length<3&&<button type="button" className="profile-color-add" disabled={saving} onClick={()=>setColors([...draft.colors,PRESETS[0].colors[draft.colors.length]])}><Plus size={16}/>Add color</button>}
     </section>
     <section className="profile-color-section"><h3>Ready-made palettes</h3><div className="profile-color-presets">{PRESETS.map(preset=><button type="button" key={preset.name} disabled={saving} aria-pressed={draft.colors.join(",").toLowerCase()===preset.colors.join(",")} onClick={()=>setColors([...preset.colors])}><span className="profile-color-preset-art" style={{backgroundImage:profileGradient(preset.colors),backgroundColor:preset.colors[0]}}/><span>{preset.name}</span></button>)}</div></section>
     {(colors.length>0||loading)&&<section className="profile-color-section"><h3>From your song cover</h3>{loading?<p className="profile-color-hint">Reading cover colors…</p>:<div className="profile-color-cover-swatches">{colors.map(color=><button type="button" key={color} disabled={saving} aria-label={`Use cover color ${color}`} aria-pressed={draft.colors.includes(color)} onClick={()=>toggle(color)} style={{backgroundColor:color}}>{draft.colors.includes(color)&&<Check size={16}/>}</button>)}</div>}</section>}
    </>}
   </div>
   <footer className="profile-color-footer">
    {error&&<p role="alert">{error}</p>}
    <button type="button" disabled={saving} onClick={onClose} className="playlist-action">Cancel</button>
    <button type="button" disabled={saving||invalid} onClick={save} className="chrome-button">{saving&&<Loader2 size={16} className="animate-spin"/>}{saving?"Saving…":"Save colors"}</button>
   </footer>
  </DialogContent>
 </Dialog>;
}
