import {useRef,useState} from 'react';
import BannerPicker from './BannerPicker';
import {Camera,Loader2,Images} from 'lucide-react';
import ProfileMotionEditor from './ProfileMotionEditor';
import {isMotionFile,PROFILE_MEDIA_ACCEPT} from '@/lib/profileMotion';
import ProfileImageEditor from './ProfileImageEditor';
export default function ProfileBannerEditor({busy,onApply,onMotionApply,onRemove,onSelect,hasBanner,current}){
 const input=useRef(null),[file,setFile]=useState(null),[gallery,setGallery]=useState(false);
 return <div className="profile-banner-controls"><input ref={input} type="file" accept={PROFILE_MEDIA_ACCEPT} hidden onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)setFile(f);}}/>
 <button type="button" disabled={busy} onClick={()=>setGallery(true)}><Images size={16}/>Banner gallery</button>
 <button type="button" disabled={busy} onClick={()=>input.current?.click()}>{busy?<Loader2 size={16} className="animate-spin"/>:<Camera size={16}/>}Change banner</button>
 {hasBanner&&<button type="button" disabled={busy} onClick={onRemove}>Use default banner</button>}
 {gallery&&<BannerPicker busy={busy} current={current} onClose={()=>setGallery(false)} onUpload={()=>{setGallery(false);input.current?.click();}} onSelect={item=>{onSelect?.(item);setGallery(false);}}/>}
 {file&&(isMotionFile(file)?<ProfileMotionEditor file={file} kind="banner" onClose={()=>setFile(null)} onApply={onMotionApply}/>:<ProfileImageEditor file={file} kind="banner" onClose={()=>setFile(null)} onApply={onApply}/>)}</div>;
}
