import {useEffect,useRef,useState} from 'react';
import {X,Share2,ScanLine,Copy,Check,RefreshCw} from 'lucide-react';
import {copyText,shareLink} from '@/lib/shareLink';
import {actionError} from '@/lib/actionError';
import MotionGradient from '@/components/MotionGradient';
import QRScannerModal from '@/components/QRScannerModal';
import './profile-qr.css';

/** @param {any} props */
export default function ProfileQRModal({url,name,avatar,username,colors=[],motion='flow',speed=1,onClose}){
 const [scanning,setScanning]=useState(false),[copied,setCopied]=useState(false),[error,setError]=useState(''),[qrFailed,setQrFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const timer=useRef(null),close=useRef(null);
 useEffect(()=>{close.current?.focus();return()=>clearTimeout(timer.current);},[]);
 useEffect(()=>{setQrFailed(false);},[url]);
 const palette=colors.filter(c=>/^#[0-9a-f]{6}$/i.test(c)).slice(0,3);
 const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=0&color=000000&bgcolor=FFFFFF&qzone=4&data=${encodeURIComponent(url)}`;
 function showCopied(){setCopied(true);clearTimeout(timer.current);timer.current=setTimeout(()=>setCopied(false),1800);}
 async function copy(){setError('');try{await copyText(url);showCopied();}catch(e){setError(actionError(e,'Couldn’t copy the link. Please retry.'));}}
 async function share(){setError('');try{const result=await shareLink({title:`${name} on PUBLIC.`,text:`Listen with ${name} on PUBLIC.`,url});if(result==='copied')showCopied();}catch(e){setError(actionError(e,'Couldn’t share the profile. Please retry.'));}}
 return <div role="dialog" aria-modal="true" aria-label="Profile QR code" data-public-dialog tabIndex={-1} className="profile-qr-overlay" onClick={()=>{if(!scanning)onClose();}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();if(!scanning)onClose();}}}>
  <section className="profile-qr-shell" onClick={e=>e.stopPropagation()}>
   <div className="profile-qr-art" aria-hidden="true">
    {palette.length>0&&<MotionGradient colors={palette} motion={motion} speed={speed} active={!scanning} className="absolute inset-0"/>}
    <div className="profile-qr-shade"/>
   </div>
   <header className="profile-qr-header"><span>PUBLIC.</span><button ref={close} type="button" onClick={onClose} aria-label="Close QR code" className="profile-qr-close"><X size={20}/></button></header>
   <div className="profile-qr-identity">
    {avatar?<img src={avatar} alt="" className="profile-qr-avatar"/>:<div className="profile-qr-avatar profile-qr-initial">{(name||'?').charAt(0)}</div>}
    <h2>{name}</h2>{username&&<p>@{username.replace(/^@/,'')}</p>}
   </div>
   <div className="profile-qr-code">
    {qrFailed?<div className="profile-qr-retry"><p>Code couldn’t load</p><button type="button" onClick={()=>{setQrFailed(false);setAttempt(n=>n+1);}}><RefreshCw size={16}/>Retry</button></div>:<img key={`${url}:${attempt}`} src={qrUrl} alt={`Scan to open ${name} on PUBLIC`} width="280" height="280" onError={()=>setQrFailed(true)}/>}
   </div>
   <p className="profile-qr-caption">Your music. Your people.<span>Scan to open this profile.</span></p>
   <div className="profile-qr-actions">
    <button type="button" className="profile-qr-share" onClick={share}><Share2 size={18}/>Share profile</button>
    <button type="button" onClick={copy} aria-label={copied?'Profile link copied':'Copy profile link'}>{copied?<Check size={18}/>:<Copy size={18}/>}<span>{copied?'Copied':'Copy link'}</span></button>
   </div>
   {error&&<p className="profile-qr-error" role="alert">{error}</p>}
   <button type="button" className="profile-qr-scan" onClick={()=>setScanning(true)}><ScanLine size={18}/>Scan a PUBLIC code</button>
  </section>
  {scanning&&<QRScannerModal onClose={()=>setScanning(false)}/>}
 </div>;
}
