import {useState} from "react";
import {Check,Upload} from "lucide-react";
import {BANNER_PRESETS} from "@/lib/bannerPresets";
import ProfileMedia from "@/components/ProfileMedia";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import "./banner-picker.css";
export default function BannerPicker({current,busy=false,onClose,onSelect,onUpload}){
 const [selected,setSelected]=useState(null);
 const preview=selected||current;
 const chosen=BANNER_PRESETS.find(item=>item.url===preview?.url);
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="public-banner-picker">
 <DialogHeader><p className="banner-picker-eyebrow">BANNER GALLERY</p><DialogTitle>Set the scene.</DialogTitle><DialogDescription>Choose a PUBLIC design or bring a little of your world.</DialogDescription></DialogHeader>
 <div className="banner-picker-preview">{preview?.url?<ProfileMedia src={preview.url} mobileSrc={preview.mobileUrl||preview.url} videoSrc={preview.videoUrl} gifSrc={preview.gifUrl} alt="Selected banner preview" style={{height:"100%",width:"100%"}}/>:<span>Your music. Your backdrop.</span>}<span className="banner-picker-preview-label">{chosen?.name||"Your current banner"}</span></div>
 <button type="button" className="banner-picker-upload" disabled={busy} onClick={onUpload}><Upload size={19}/><span>Upload photo, video or GIF<small>Video or GIF loops up to 10 seconds</small></span></button>
 <div className="banner-picker-grid" role="group" aria-label="Profile banner designs">{BANNER_PRESETS.map(item=><button type="button" key={item.id} disabled={busy} aria-label={"Choose "+item.name+" banner"} aria-pressed={preview?.url===item.url} onClick={()=>setSelected(item)}><span><img src={item.url} alt="" loading="lazy"/>{preview?.url===item.url&&<i><Check size={14}/></i>}</span><strong>{item.name}</strong></button>)}</div>
 <footer className="banner-picker-footer"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" disabled={busy||!selected} onClick={()=>onSelect(selected)}>Use banner</button></footer>
 <p className="banner-picker-hint">Applied when you save your profile changes.</p>
 </DialogContent></Dialog>;
}
