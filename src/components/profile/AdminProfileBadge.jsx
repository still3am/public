import {useId,useState} from 'react';
import './admin-profile-badge.css';

const ROLES={
 admin:{label:'PUBLIC Admin',detail:'Manages and moderates PUBLIC.',colors:['#e0edff','#a99bff','#65bde9'],ink:'#17213b'},
 artist:{label:'PUBLIC Artist',detail:'Artist approved by PUBLIC.',colors:['#ffffff','#edf0f5','#c4cbd6'],ink:'#171a20'},
 uploader:{label:'PUBLIC Uploader',detail:'Approved to upload music to PUBLIC.',colors:['#fff0bb','#edc568','#c89035'],ink:'#38270d'},
};
export default function ProfileBadge({variant='admin'}){
 const role=ROLES[variant]||ROLES.admin;
 const id=useId().replace(/:/g,''),[open,setOpen]=useState(false);
 return <button type="button" className={`profile-admin-badge profile-role-${variant} absolute top-3 right-3 md:top-5 md:right-5 z-20`} title={role.label} aria-label={role.label} aria-expanded={open} aria-describedby={open?`${id}-label`:undefined} onClick={()=>setOpen(v=>!v)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);}}}>
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
   <defs><linearGradient id={`${id}-fill`} x1="8" y1="2" x2="31" y2="39" gradientUnits="userSpaceOnUse">{role.colors.map((color,i)=><stop key={color} offset={i/2} stopColor={color}/>)}</linearGradient><linearGradient id={`${id}-edge`} x1="8" y1="3" x2="30" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity=".95"/><stop offset="1" stopColor="#fff" stopOpacity=".15"/></linearGradient></defs>
   <path d="m20 2.5 4.5 2.7 5.2.2 2.8 4.4 4.3 2.9.1 5.2 2.6 4.6-2.6 4.5-.1 5.2-4.3 2.9-2.8 4.4-5.2.2L20 37.5l-4.5-2.7-5.2-.2-2.8-4.4-4.3-2.9-.1-5.2L.5 17.5l2.6-4.5.1-5.2 4.3-2.9 2.8-4.4 5.2-.2Z" transform="translate(2 3) scale(.9)" fill={`url(#${id}-fill)`} stroke={`url(#${id}-edge)`} strokeWidth="1.1" strokeLinejoin="round"/>
   <circle cx="20" cy="20" r="11.8" stroke={role.ink} strokeOpacity=".13" strokeWidth=".8"/>
   <path d="m13.5 20 4.3 4.2 8.7-9" stroke={role.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
  {open&&<span id={`${id}-label`} className="profile-admin-label" role="status"><strong>{role.label}</strong><span>{role.detail}</span></span>}
 </button>;
}
