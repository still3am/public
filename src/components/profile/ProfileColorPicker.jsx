import {useEffect,useRef,useState} from "react";
import {ArrowLeft,ArrowRight,Check,GripHorizontal,Loader2,Plus,Shuffle,Undo2,X} from "lucide-react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import MotionGradient from "@/components/MotionGradient";
import ProfileMedia from "@/components/ProfileMedia";
import {base44} from "@/api/base44Client";
import {isMotionFile,prepareProfileMotion,profileMotionSeconds} from "@/lib/profileMotion";
import ProfileColorWheel,{hexToHsv,hsvToHex} from "./ProfileColorWheel";
import "./profile-colors.css";

const PRESETS=[
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
/** @param {string[]} colors */
const presetGradient=([a,b,c])=>
 `radial-gradient(ellipse at 12% 12%, ${b} 0%, ${b}00 64%),radial-gradient(ellipse at 90% 85%, ${c} 0%, ${c}00 68%),linear-gradient(135deg, ${a} 15%, ${a} 55%, ${c} 100%)`;
const MAX_COLORS=5;
const PALETTE_TONES=[[.76,.43],[.70,.86],[.37,.97],[.55,.69],[.43,.91]];
const valid=color=>/^#[0-9a-f]{6}$/i.test(color);
const normalize=text=>"#"+text.replace(/^#/,"").toLowerCase();

export default function ProfileColorPicker({coverUrl,colors,loading,value,onPreview,onSave,onClose}){
 const [draft,setDraft]=useState(()=>({mode:value.mode,colors:[...value.colors],motion:value.motion||"flow",speed:value.speed||1,media:value.media}));
 const [saving,setSaving]=useState(false),[error,setError]=useState("");
 const saveLock=useRef(false);
 const fileInput=useRef(null), fileLock=useRef(false);
 const [mediaTab,setMediaTab]=useState(Boolean(value.media?.src));
 const [pending,setPending]=useState(null),[localMedia,setLocalMedia]=useState(null),[preparing,setPreparing]=useState(false);
 useEffect(()=>{
  if(!pending){setLocalMedia(null);return;}
  const src=URL.createObjectURL(pending.poster||pending.file);
  const motionUrl=pending.poster?URL.createObjectURL(pending.file):"";
  setLocalMedia({src,gifSrc:pending.type==="gif"?motionUrl:"",videoSrc:pending.type==="video"?motionUrl:""});
  return()=>{URL.revokeObjectURL(src);if(motionUrl)URL.revokeObjectURL(motionUrl);};
 },[pending]);
 async function chooseMedia(file){
  if(!file||fileLock.current||saveLock.current)return;
  fileLock.current=true;setPreparing(true);setError("");
  try{
   if(isMotionFile(file))setPending(await prepareProfileMotion(file,"background"));
   else {
    if(!/^image\/(jpeg|png|webp|avif)$/.test(file.type)||!file.size||file.size>10*1024*1024)throw Error("Choose a JPG, PNG, WebP or AVIF photo under 10 MB.");
    const preview=await createImageBitmap(file);
    preview.close();
    setPending({file});
   }
  }catch(error){setError(error.message||"This file could not be opened.");}
  finally{fileLock.current=false;setPreparing(false);}
 }
 async function uploadMedia(selection){
  if(selection.uploaded)return selection.uploaded;
  const upload=async file=>{
   const result=await base44.integrations.Core.UploadFile({file});
   if(!result?.file_url)throw Error("Your background did not upload. Please retry.");
   return result.file_url;
  };
  const [src,motionUrl]=await Promise.all([upload(selection.poster||selection.file),selection.poster?upload(selection.file):""]);
  selection.uploaded={src,gifSrc:selection.type==="gif"?motionUrl:"",videoSrc:selection.type==="video"?motionUrl:""};
  return selection.uploaded;
 }
 const [beforeRandomize,setBeforeRandomize]=useState(null);
 const [activeColor,setActiveColor]=useState(0);
 const drag=useRef(null);
 const ignoreClick=useRef(false);
 const [dragIndex,setDragIndex]=useState(null);
 const [dropIndex,setDropIndex]=useState(null);
 const activeIndex=Math.min(activeColor,Math.max(0,draft.colors.length-1));
 const update=next=>{if(saveLock.current)return;setError("");setBeforeRandomize(null);setDraft(next);onPreview({...next,colors:next.colors.filter(valid)});};
 const customColors=draft.colors.length?draft.colors:colors.slice(0,3).length?colors.slice(0,3):PRESETS[0].colors;
 const setColors=next=>update({...draft,mode:"custom",colors:next.slice(0,MAX_COLORS)});
 const moveColor=(from,to)=>{
  if(saveLock.current||from===to||to<0||to>=draft.colors.length)return;
  const next=[...draft.colors];
  next.splice(to,0,next.splice(from,1)[0]);
  setActiveColor(to);
  setColors(next);
 };
 const targetAt=event=>{
  const slots=event.currentTarget.parentElement.parentElement.querySelectorAll("[data-profile-color-slot]");
  for(const slot of slots){
   const box=slot.getBoundingClientRect();
   if(event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom)return Number(slot.dataset.profileColorSlot);
  }
  return null;
 };
 const endDrag=event=>{
  if(drag.current?.pointer!==event.pointerId)return;
  const from=drag.current.index;
  const to=event.type==="pointerup"?targetAt(event):null;
  drag.current=null;
  setDragIndex(null);
  setDropIndex(null);
  if(to!==null&&to!==from){ignoreClick.current=true;moveColor(from,to);}
 };
 const dragHandlers=index=>({
  onPointerDown:event=>{
   if(event.button!==0||drag.current||draft.colors.length<2)return;
   ignoreClick.current=false;
   drag.current={pointer:event.pointerId,index};
   event.currentTarget.setPointerCapture(event.pointerId);
   setDragIndex(index);
   setDropIndex(index);
  },
  onPointerMove:event=>{
   if(drag.current?.pointer===event.pointerId)setDropIndex(targetAt(event));
  },
  onPointerUp:endDrag,
  onPointerCancel:endDrag,
  onLostPointerCapture:endDrag
 });
 const toggle=color=>setColors(draft.mode==="custom"&&draft.colors.includes(color)?draft.colors.filter(c=>c!==color):[...(draft.mode==="custom"?draft.colors:[]),color].slice(-MAX_COLORS));
 const addColor=()=>{
  const index=draft.colors.length;
  const base=draft.colors.find(valid)||PRESETS[0].colors[0];
  const {h}=hexToHsv(base);
  const tone=PALETTE_TONES[index];
  const color=[45,75,110,155,200,250].map(offset=>hsvToHex((h+offset+index*23)%360,...tone))
   .find(candidate=>!draft.colors.some(existing=>existing.toLowerCase()===candidate));
  setActiveColor(index);
  setColors([...draft.colors,color]);
 };
 const randomize=()=>{
  const count=draft.mode==="custom"?draft.colors.length||3:customColors.length;
  const next=new Set();
  while(next.size<count){
   next.add("#"+Math.floor(Math.random()*0x1000000).toString(16).padStart(6,"0"));
  }
  if(saveLock.current)return;
  setColors([...next]);
  setBeforeRandomize(beforeRandomize||{draft,activeIndex});
  setActiveColor(0);
 };
 const undoRandomize=()=>{
  if(!beforeRandomize||saveLock.current)return;
  update(beforeRandomize.draft);
  setActiveColor(beforeRandomize.activeIndex);
 };
 const preview=draft.mode==="off"?[]:draft.mode==="custom"?draft.colors.filter(valid):colors.slice(0,3);
 const invalid=!mediaTab&&draft.mode==="custom"&&(!draft.colors.length||draft.colors.some(color=>!valid(color)));
 const save=async()=>{
  if(saveLock.current||fileLock.current||invalid||mediaTab&&!pending&&!draft.media?.src)return;
  saveLock.current=true;setSaving(true);setError("");
  try{
   const media=mediaTab?(pending?await uploadMedia(pending):draft.media):null;
   await onSave({...draft,media,colors:[...new Set(draft.colors.filter(valid).map(c=>c.toLowerCase()))]});
   onClose();
  }catch(error){setError(error.message||"Your background couldn’t save. Please retry.");}
  finally{saveLock.current=false;setSaving(false);}
 };
 const mediaPreview=mediaTab?(pending?localMedia:draft.media):null;
 return <Dialog open onOpenChange={open=>{if(!open&&!saveLock.current&&!fileLock.current)onClose();}}>
  <DialogContent className="profile-palette-dialog profile-color-editor" data-public-dialog>
   <DialogHeader><DialogTitle>Your profile colors</DialogTitle><DialogDescription>Choose a gradient, photo, GIF, or short video for your profile background.</DialogDescription></DialogHeader>
   <div className="profile-color-body">
    <div className="profile-color-preview">
     {mediaPreview?.src&&<ProfileMedia {...mediaPreview} className="profile-background-preview-media" style={{position:"absolute",inset:0,zIndex:-2}} />}
     {!mediaTab&&preview.length>0&&<MotionGradient colors={preview} motion={draft.motion} speed={draft.speed} className="absolute inset-0" style={{borderRadius:"inherit",zIndex:-2}}/>}
     {!mediaTab&&coverUrl&&<img src={coverUrl} alt="" onError={event=>{event.currentTarget.style.display="none";}}/>}
     <div><strong>Make it yours</strong><span>Live profile preview</span></div>
    </div>
    <div className="profile-color-modes" role="group" aria-label="Profile background type">
     <button type="button" disabled={saving||preparing} aria-pressed={!mediaTab} onClick={()=>{setError("");setMediaTab(false);update({...draft,media:null});}}>Colors</button>
     <button type="button" disabled={saving||preparing} aria-pressed={mediaTab} onClick={()=>{setError("");setMediaTab(true);}}>Photo, GIF or video</button>
    </div>
    {mediaTab?<section className="profile-color-section">
     <h3>Background media</h3>
     <p className="profile-color-hint">GIFs and videos loop silently for up to {profileMotionSeconds("background")} seconds per loop. Your profile song can still play.</p>
     <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/quicktime,video/webm" onChange={event=>{chooseMedia(event.target.files?.[0]);event.target.value="";}} />
     <button type="button" className="profile-color-create" disabled={saving||preparing} onClick={()=>fileInput.current?.click()}><Plus size={16}/>{preparing?"Preparing preview…":mediaPreview?.src?"Replace background":"Choose a file"}</button>
    </section>:<>
    <div className="profile-color-modes" role="group" aria-label="Profile background mode">
     {[["auto","Automatic"],["custom","Custom"],["off","No color"]].map(([mode,label])=><button type="button" key={mode} disabled={saving} aria-pressed={draft.mode===mode} onClick={()=>update({...draft,mode,colors:mode==="custom"?customColors:draft.colors})}>{label}</button>)}
    </div>
    <p className="profile-color-hint">{draft.mode==="auto"?(coverUrl?"Colors update with your profile song.":"Add a profile song for automatic colors, or choose Custom now."):draft.mode==="off"?"Use PUBLIC’s clean background. Your custom palette is kept.":"Your custom colors stay the same when you change your profile song."}</p>
    {draft.mode!=="custom"&&<button type="button" className="profile-color-create" disabled={saving} onClick={()=>{setActiveColor(0);setColors(customColors);}}><Plus size={16}/>Create your own palette</button>}

    <div className="profile-color-random-actions">
     <button type="button" className="profile-color-create" disabled={saving} onClick={randomize}><Shuffle size={16}/>Randomize colors</button>
     {beforeRandomize&&<button type="button" className="profile-color-create" disabled={saving} onClick={undoRandomize}><Undo2 size={16}/>Undo shuffle</button>}
    </div>
    {draft.mode==="custom"&&<>
     <section className="profile-color-section">
      <h3>Your colors <span>{draft.colors.length} / {MAX_COLORS}</span></h3>
      {draft.colors.length>1&&<p className="profile-color-hint" id="profile-color-reorder">Drag a swatch or select it and use the arrows below.</p>}
      <div className="profile-color-quick-stops" role="group" aria-label="Gradient colors">
       {draft.colors.map((color,index)=><div className="profile-color-slot" data-profile-color-slot={index} data-drag-source={dragIndex===index} data-drop-target={dropIndex===index&&dragIndex!==index} key={index}>
        <button type="button" disabled={saving} aria-label={`Edit gradient color ${index+1}`} aria-pressed={activeIndex===index} {...dragHandlers(index)} onClick={event=>{if(!event.detail||!ignoreClick.current)setActiveColor(index);ignoreClick.current=false;}}>
         <span style={{background:valid(color)?color:"#777777"}}>{activeIndex===index&&<Check size={16}/>}</span><small>Color {index+1}</small>
        </button>
        {draft.colors.length>1&&<button type="button" className="profile-color-grip" disabled={saving} aria-label={`Reorder color ${index+1}`} aria-describedby="profile-color-reorder"
         {...dragHandlers(index)}
         onKeyDown={event=>{
          if(event.key!=="ArrowLeft"&&event.key!=="ArrowRight")return;
          event.preventDefault();
          const to=index+(event.key==="ArrowLeft"?-1:1);
          const handle=event.currentTarget.parentElement.parentElement.children[to]?.querySelector(".profile-color-grip");
          if(handle){moveColor(index,to);handle.focus();}
         }}><GripHorizontal size={18}/></button>}
       </div>)}
       {draft.colors.length<MAX_COLORS&&<button type="button" disabled={saving} aria-label="Add gradient color" onClick={addColor}><span><Plus size={18}/></span><small>Add color</small></button>}
      </div>
      {draft.colors.length>1&&<div className="profile-color-order" role="group" aria-label="Move selected color">
       <button type="button" aria-label="Move selected color earlier" disabled={saving||activeIndex===0} onClick={()=>moveColor(activeIndex,activeIndex-1)}><ArrowLeft size={16}/> Move earlier</button>
       <span aria-live="polite">Color {activeIndex+1} of {draft.colors.length}</span>
       <button type="button" aria-label="Move selected color later" disabled={saving||activeIndex===draft.colors.length-1} onClick={()=>moveColor(activeIndex,activeIndex+1)}>Move later <ArrowRight size={16}/></button>
      </div>}
     </section>
     {draft.colors.length>0&&<ProfileColorWheel key={activeIndex} colorNumber={activeIndex+1} value={valid(draft.colors[activeIndex])?draft.colors[activeIndex]:"#777777"} disabled={saving} onChange={color=>setColors(draft.colors.map((c,i)=>i===activeIndex?color:c))}/>}
     <details className="profile-color-section profile-color-details"><summary>Hex codes &amp; remove colors</summary>
      <div className="profile-color-stops">{draft.colors.map((color,index)=><div className="profile-color-stop" key={index}>
       <button type="button" className="profile-color-wheel profile-color-select" aria-label={`Edit color ${index+1} on the wheel`} aria-pressed={activeIndex===index} disabled={saving} style={{backgroundColor:valid(color)?color:"#777777"}} onClick={()=>setActiveColor(index)}>{activeIndex===index&&<Check size={16}/>}</button>
       <label className="profile-color-hex"><span>Color {index+1}</span><input aria-label={`Color ${index+1} hex code`} spellCheck={false} autoComplete="off" maxLength={7} value={color} disabled={saving} aria-invalid={!valid(color)} onChange={event=>setColors(draft.colors.map((c,i)=>i===index?normalize(event.target.value):c))}/></label>
       <button type="button" disabled={saving} aria-label={`Remove color ${index+1}`} onClick={()=>setColors(draft.colors.filter((_,i)=>i!==index))}><X size={16}/></button>
      </div>)}</div>
      {draft.colors.some(c=>!valid(c))&&<p className="profile-color-hint" role="status">Use a six-digit hex color, such as #6948a6.</p>}
      {draft.colors.length<MAX_COLORS&&<button type="button" className="profile-color-add" disabled={saving} onClick={addColor}><Plus size={16}/>Add color</button>}
     </details>
     <section className="profile-color-section"><h3>Ready-made palettes</h3><div className="profile-color-presets">{PRESETS.map(preset=><button type="button" key={preset.name} disabled={saving} aria-pressed={draft.colors.join(",").toLowerCase()===preset.colors.join(",")} onClick={()=>setColors([...preset.colors])}><span className="profile-color-preset-art" style={{backgroundImage:presetGradient(preset.colors),backgroundColor:preset.colors[0]}}>{draft.colors.join(",").toLowerCase()===preset.colors.join(",")&&<span className="profile-color-preset-check"><Check size={14}/></span>}</span><span>{preset.name}</span></button>)}</div></section>
     {(colors.length>0||loading)&&<section className="profile-color-section"><h3>From your song cover</h3>{loading?<p className="profile-color-hint">Reading cover colors…</p>:<div className="profile-color-cover-swatches">{colors.map(color=><button type="button" key={color} disabled={saving} aria-label={`Use cover color ${color}`} aria-pressed={draft.colors.includes(color)} onClick={()=>toggle(color)} style={{backgroundColor:color}}>{draft.colors.includes(color)&&<Check size={16}/>}</button>)}</div>}</section>}
    </>}
    {draft.mode!=="off"&&<details className="profile-color-section profile-color-details"><summary>Movement &amp; speed</summary>
     <div className="profile-color-modes profile-motion-modes" role="group" aria-label="Gradient movement">{[["still","Still"],["flow","Flowing"]].map(([motion,label])=><button key={motion} type="button" disabled={saving} aria-pressed={draft.motion===motion} onClick={()=>update({...draft,motion})}>{label}</button>)}</div>
     {draft.motion==="flow"&&<label className="profile-motion-speed"><span>Speed <span>{draft.speed<.75?"Slow":draft.speed>1.2?"Lively":"Gentle"}</span></span><input type="range" min=".35" max="1.6" step=".05" value={draft.speed} disabled={saving} aria-label="Gradient movement speed" onChange={event=>update({...draft,speed:Number(event.target.value)})}/></label>}
     <p className="profile-color-hint">Motion follows each viewer’s Reduce Motion setting.</p>
    </details>}
    </>}
   </div>
   <footer className="profile-color-footer">
    {error&&<p role="alert">{error}</p>}
    {invalid&&<p role="status">Add at least one valid color. Check Hex codes for incomplete entries.</p>}
    <button type="button" disabled={saving||preparing} onClick={onClose} className="playlist-action">Cancel</button>
    <button type="button" disabled={saving||preparing||invalid||(mediaTab&&!pending&&!draft.media?.src)} onClick={save} className="chrome-button">{saving&&<Loader2 size={16} className="animate-spin"/>}{saving?"Saving…":"Save background"}</button>
   </footer>
  </DialogContent>
 </Dialog>;
}
