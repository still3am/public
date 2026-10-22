import {useAuth} from "@/lib/AuthContext";
import {useAvatarGallery} from "@/hooks/useAvatarGallery";
import {useState} from "react";
import {Upload,Check,X} from "lucide-react";
import {AVATAR_PRESETS} from "@/lib/avatarPresets";
import Avatar from "@/components/Avatar";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import "./avatar-picker.css";
export default function AvatarPicker({user,busy=false,onClose,onSelect,onUpload,onEditPhoto,error,allowMotion=false}){
 const {user:viewer}=useAuth();
 const {avatars,loading,error:galleryError,deleting,remove}=useAvatarGallery();
 const [pendingDelete,setPendingDelete]=useState(null);
 const [selected,setSelected]=useState(user?.avatar_url||"");
 const chosen=AVATAR_PRESETS.find(item=>item.url===selected);
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="public-avatar-picker"><DialogHeader><p className="avatar-picker-eyebrow">AVATAR GALLERY</p><DialogTitle>Find your face.</DialogTitle><DialogDescription>{allowMotion?"Choose a gallery avatar or upload a photo, short video or GIF.":"Choose a gallery avatar or upload your own photo."}</DialogDescription></DialogHeader>
 <div className="avatar-picker-preview"><Avatar user={{...user,avatar_url:selected,avatar_preset:"",avatar_video_url:selected===user?.avatar_url?user?.avatar_video_url:"",avatar_gif_url:selected===user?.avatar_url?user?.avatar_gif_url:""}} size={100} motion/><div><strong>{chosen?.name||(selected?(selected===user?.avatar_url&&user?.avatar_video_url?"Your video":selected===user?.avatar_url&&user?.avatar_gif_url?"Your GIF":"Your photo"):"Default avatar")}</strong><p>Made to fit your circle.</p></div></div>
 <button type="button" className="avatar-picker-upload" disabled={busy} onClick={onUpload}><Upload size={18}/><span>{allowMotion?"Upload photo, video or GIF":"Upload a photo"}<small>{allowMotion?"10-second loops · video up to 25 MB · images up to 10 MB":"Choose an image from your device · up to 10 MB"}</small></span></button>
 {onEditPhoto&&!user?.avatar_video_url&&!user?.avatar_gif_url&&selected===user?.avatar_url&&selected&&!chosen&&<button type="button" className="avatar-picker-upload" disabled={busy} onClick={onEditPhoto}>Adjust current photo</button>}
 {(error||galleryError)&&<p role="alert" className="profile-editor-error">{error||galleryError}</p>}
 {loading&&<p role="status">Loading avatars…</p>}
 {pendingDelete&&<div className="avatar-delete-confirm"><p>Delete {pendingDelete.name} from everyone’s gallery? Existing profile images will stay.</p><button type="button" disabled={!!deleting} onClick={()=>setPendingDelete(null)}>Cancel</button><button type="button" disabled={!!deleting||busy} onClick={async()=>{const item=pendingDelete;if(await remove(item.id)){setPendingDelete(null);}}}>{deleting?"Deleting…":"Delete avatar"}</button></div>}
 <div className="avatar-picker-grid" role="group" aria-label="Profile avatar designs">{avatars.map(item=><div className="avatar-gallery-item" key={item.id}><button type="button" key={item.id} disabled={busy} aria-label={"Choose "+item.name+" avatar"} aria-pressed={selected===item.url} onClick={()=>setSelected(item.url)}><span className="avatar-picker-thumb"><img src={item.url} alt="" loading="lazy"/>{selected===item.url&&<span className="avatar-picker-check"><Check size={14}/></span>}</span><strong>{item.name}</strong></button>{viewer?.role==="admin"&&<span className="avatar-gallery-controls"><button type="button" className="avatar-gallery-delete" aria-label={"Delete "+item.name+" avatar"} disabled={busy||!!deleting} onClick={()=>setPendingDelete(item)}><X size={13} strokeWidth={2} aria-hidden="true"/></button></span>}</div>)}</div>
 <button type="button" disabled={busy} className="avatar-picker-initials" aria-pressed={!selected} onClick={()=>setSelected("")}>Use default avatar</button>
 <div className="avatar-picker-footer"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="avatar-picker-confirm" disabled={busy} onClick={()=>onSelect(selected)}>Use {chosen?"avatar":selected?(selected===user?.avatar_url&&(user?.avatar_video_url||user?.avatar_gif_url)?"animation":"photo"):"default avatar"}</button></div>
 <p className="avatar-picker-hint">{chosen?.credit||"Artwork by mu.staffa · supplied by PUBLIC."}<br/>Your choice is applied when you save your profile changes.</p>
 </DialogContent></Dialog>;
}