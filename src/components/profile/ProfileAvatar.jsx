import "./profile-edit-controls.css";
import ProfileMotionEditor from "./ProfileMotionEditor";
import {isMotionFile,PROFILE_MEDIA_ACCEPT} from "@/lib/profileMotion";
import ProfileImageEditor from "./ProfileImageEditor";
import {useCoverUrl} from "@/hooks/useCoverUrl";
import AvatarPicker from "./AvatarPicker";
import {useRef,useState} from "react";
import {Camera,Loader2} from "lucide-react";
import Avatar from "@/components/Avatar";

/** One frame for both uploaded images and initials, with an accessible upload control. */
export default function ProfileAvatar({user,editing=false,busy=false,onUpload,onMotionUpload,onSelect,active=true}){
 const input=useRef(null);
 const [pickerOpen,setPickerOpen]=useState(false),[file,setFile]=useState(null),[error,setError]=useState("");
 const source=useCoverUrl(user?.avatar_url);
 async function editPhoto(){try{const response=await fetch(source);if(!response.ok)throw Error();const blob=await response.blob();setFile(new File([blob],"profile-photo",{type:blob.type}));setPickerOpen(false);setError("");}catch{setError("Couldn’t open this photo. Upload the original to adjust its crop.");}}
 return <div className="profile-avatar-frame relative shrink-0">
  <Avatar user={user} size={96} className="profile-desktop-avatar" motion active={active}/>
  {editing&&<>
   <button type="button" aria-label={busy?"Uploading profile image":"Choose profile image"} disabled={busy} onClick={()=>setPickerOpen(true)} className="profile-edit-circle profile-avatar-upload absolute bottom-1 right-1 w-10 h-10 rounded-full bg-foreground text-background grid place-items-center border-2 border-card shadow-sm disabled:opacity-60" title="Change profile image">
    {busy?<Loader2 size={16} className="animate-spin"/>:<Camera size={17}/>}
   </button>
   {pickerOpen&&<AvatarPicker user={user} busy={busy} onEditPhoto={editPhoto} error={error} onClose={()=>setPickerOpen(false)} onSelect={value=>{onSelect?.(value);setPickerOpen(false);}} onUpload={()=>{setPickerOpen(false);input.current?.click();}}/>}
   {file&&(isMotionFile(file)?<ProfileMotionEditor file={file} onClose={()=>setFile(null)} onApply={onMotionUpload}/>:<ProfileImageEditor file={file} onClose={()=>setFile(null)} onApply={files=>onUpload?.(files.avatar)}/>)}
   <input ref={input} disabled={busy} type="file" accept={PROFILE_MEDIA_ACCEPT} className="hidden" aria-label="Profile image file" onChange={event=>{const file=event.target.files?.[0];event.target.value="";if(file)setFile(file);}}/>
  </>}
 </div>;
}