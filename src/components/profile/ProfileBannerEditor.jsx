import {useRef,useState} from 'react';
import {Camera,Loader2} from 'lucide-react';
import ProfileImageEditor from './ProfileImageEditor';
export default function ProfileBannerEditor({busy,onApply,onRemove,hasBanner}){
 const input=useRef(null),[file,setFile]=useState(null);
 return <div className="profile-banner-controls"><input ref={input} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)setFile(f);}}/>
 <button type="button" disabled={busy} onClick={()=>input.current?.click()}>{busy?<Loader2 size={16} className="animate-spin"/>:<Camera size={16}/>}Change banner</button>
 {hasBanner&&<button type="button" disabled={busy} onClick={onRemove}>Use default banner</button>}
 {file&&<ProfileImageEditor file={file} kind="banner" onClose={()=>setFile(null)} onApply={onApply}/>}</div>;
}
