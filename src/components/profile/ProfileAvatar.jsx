import "./profile-edit-controls.css";
import {useRef} from "react";
import {Camera,Loader2} from "lucide-react";
import Avatar from "@/components/Avatar";

/** One frame for both uploaded images and initials, with an accessible upload control. */
export default function ProfileAvatar({user,editing=false,busy=false,onUpload}){
 const input=useRef(null);
 return <div className="profile-avatar-frame relative shrink-0">
  <Avatar user={user} size={96} className="profile-desktop-avatar"/>
  {editing&&<>
   <button type="button" aria-label={busy?"Uploading profile image":"Choose profile image"} disabled={busy} onClick={()=>input.current?.click()} className="profile-edit-circle profile-avatar-upload absolute bottom-1 right-1 w-10 h-10 rounded-full bg-foreground text-background grid place-items-center border-2 border-card shadow-sm disabled:opacity-60" title="Change profile image">
    {busy?<Loader2 size={16} className="animate-spin"/>:<Camera size={17}/>}
   </button>
   <input ref={input} disabled={busy} type="file" accept="image/*" className="hidden" aria-label="Profile image file" onChange={event=>{const file=event.target.files?.[0];event.target.value="";if(file)onUpload?.(file);}}/>
  </>}
 </div>;
}
