import {useState} from "react";
import {Upload,Check} from "lucide-react";
import {AVATAR_PRESETS} from "@/lib/avatarPresets";
import Avatar from "@/components/Avatar";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import "./avatar-picker.css";
export default function AvatarPicker({user,busy=false,onClose,onSelect,onUpload,onEditPhoto,error,allowMotion=false}){
 const [selected,setSelected]=useState(user?.avatar_url||"");
 const chosen=AVATAR_PRESETS.find(item=>item.url===selected);
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="public-avatar-picker"><DialogHeader><p className="avatar-picker-eyebrow">AVATAR GALLERY</p><DialogTitle>Find your face.</DialogTitle><DialogDescription>{allowMotion?"Choose a gallery avatar or upload a photo, short video or GIF.":"Choose a gallery avatar or upload your own photo."}</DialogDescription></DialogHeader>
 <div className="avatar-picker-preview"><Avatar user={{...user,avatar_url:selected,avatar_preset:"",avatar_video_url:selected===user?.avatar_url?user?.avatar_video_url:"",avatar_gif_url:selected===user?.avatar_url?user?.avatar_gif_url:""}} size={100} motion/><div><strong>{chosen?.name||(selected?(selected===user?.avatar_url&&user?.avatar_video_url?"Your video":selected===user?.avatar_url&&user?.avatar_gif_url?"Your GIF":"Your photo"):"Your initials")}</strong><p>Made to fit your circle.</p></div></div>
 <button type="button" className="avatar-picker-upload" disabled={busy} onClick={onUpload}><Upload size={18}/><span>{allowMotion?"Upload photo, video or GIF":"Upload a photo"}<small>{allowMotion?"10-second loops · video up to 25 MB · images up to 10 MB":"Choose an image from your device · up to 10 MB"}</small></span></button>
 {onEditPhoto&&!user?.avatar_video_url&&!user?.avatar_gif_url&&selected===user?.avatar_url&&selected&&!chosen&&<button type="button" className="avatar-picker-upload" disabled={busy} onClick={onEditPhoto}>Adjust current photo</button>}
 {error&&<p role="alert" className="profile-editor-error">{error}</p>}
 <div className="avatar-picker-grid" role="group" aria-label="Profile avatar designs">{AVATAR_PRESETS.map(item=><button type="button" key={item.id} disabled={busy} aria-label={"Choose "+item.name+" avatar"} aria-pressed={selected===item.url} onClick={()=>setSelected(item.url)}><span className="avatar-picker-thumb"><img src={item.url} alt="" loading="lazy"/>{selected===item.url&&<span className="avatar-picker-check"><Check size={14}/></span>}</span><strong>{item.name}</strong></button>)}</div>
 <button type="button" disabled={busy} className="avatar-picker-initials" aria-pressed={!selected} onClick={()=>setSelected("")}>Use my initials instead</button>
 <div className="avatar-picker-footer"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="avatar-picker-confirm" disabled={busy} onClick={()=>onSelect(selected)}>Use {chosen?"avatar":selected?(selected===user?.avatar_url&&(user?.avatar_video_url||user?.avatar_gif_url)?"animation":"photo"):"initials"}</button></div>
 <p className="avatar-picker-hint">Artwork by mu.staffa · supplied by PUBLIC.<br/>Your choice is applied when you save your profile changes.</p>
 </DialogContent></Dialog>;
}