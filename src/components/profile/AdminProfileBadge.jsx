import {useId,useState} from "react";
import "./admin-profile-badge.css";

export default function AdminProfileBadge(){
 const gradient=useId().replace(/:/g,""),[open,setOpen]=useState(false);
 return <button type="button" className="profile-admin-badge absolute top-3 right-3 md:top-5 md:right-5 z-20" title="PUBLIC Admin" aria-label="PUBLIC Admin" aria-expanded={open} onClick={()=>setOpen(v=>!v)} onBlur={()=>setOpen(false)} onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();setOpen(false);}}}>
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
   <defs><linearGradient id={gradient} x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#eef5ff"/><stop offset=".30" stopColor="#a794f4"/><stop offset=".64" stopColor="#6ebeed"/><stop offset="1" stopColor="#e4eaf4"/></linearGradient></defs>
   <path d="M16 2 20 4.5 24.7 4.7 26.8 9 30 12.5 29 17.2 29.2 22 25.2 24.7 22.5 28.5 17.7 28.4 13 30 9.3 27 4.8 25.5 4.3 20.7 2 16.5 4.1 12.2 4.5 7.4 9 5.5 12.5 2.2Z" fill={`url(#${gradient})`} stroke="#ffffff" strokeOpacity=".5" strokeWidth=".7" strokeLinejoin="round"/>
   <path d="m10 16 4 4 8-9" stroke="#17213b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
  {open&&<span className="profile-admin-label" role="status">PUBLIC Admin</span>}
 </button>;
}
