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
   <defs><linearGradient className="profile-badge-fill" id={`${id}-fill`} x1="8" y1="2" x2="31" y2="39" gradientUnits="userSpaceOnUse">{role.colors.map((color,i)=><stop key={color} offset={i/2} stopColor={color}/>)}</linearGradient><linearGradient id={`${id}-edge`} x1="8" y1="3" x2="30" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity=".95"/><stop offset="1" stopColor="#fff" stopOpacity=".15"/></linearGradient></defs>
   <path d="M17.93 3.27 Q20.00 2.00 22.07 3.27 Q24.14 4.55 26.57 4.48 Q29.00 4.41 30.16 6.55 Q31.31 8.69 33.45 9.84 Q35.59 11.00 35.52 13.43 Q35.45 15.86 36.73 17.93 Q38.00 20.00 36.73 22.07 Q35.45 24.14 35.52 26.57 Q35.59 29.00 33.45 30.16 Q31.31 31.31 30.16 33.45 Q29.00 35.59 26.57 35.52 Q24.14 35.45 22.07 36.73 Q20.00 38.00 17.93 36.73 Q15.86 35.45 13.43 35.52 Q11.00 35.59 9.84 33.45 Q8.69 31.31 6.55 30.16 Q4.41 29.00 4.48 26.57 Q4.55 24.14 3.27 22.07 Q2.00 20.00 3.27 17.93 Q4.55 15.86 4.48 13.43 Q4.41 11.00 6.55 9.84 Q8.69 8.69 9.84 6.55 Q11.00 4.41 13.43 4.48 Q15.86 4.55 17.93 3.27 Z" fill={`url(#${id}-fill)`} stroke={`url(#${id}-edge)`} strokeWidth="1.1" strokeLinejoin="round"/>
   <circle cx="20" cy="20" r="11.8" stroke={role.ink} strokeOpacity=".13" strokeWidth=".8"/>
   <path d="m13.5 20 4.3 4.2 8.7-9" stroke={role.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
  {open&&<span id={`${id}-label`} className="profile-admin-label" role="status"><strong>{role.label}</strong><span>{role.detail}</span></span>}
 </button>;
}
