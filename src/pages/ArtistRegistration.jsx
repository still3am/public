import {withReadTimeout} from "@/lib/readTimeout";
import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowLeft,Check,Mic2,Loader2} from 'lucide-react';
import {useAuth} from '@/lib/AuthContext';
import {base44} from '@/api/base44Client';
import {creatorType} from '@/lib/creatorAccess';
import './upload-studio.css';
/** @param {unknown} value */
function applicationRows(value){
 const rows=Array.isArray(value)?value:value&&typeof value==='object'&&'items' in value?value.items:null;
 if(!Array.isArray(rows))throw Error('Application status could not be checked.');
 return rows;
}
export default function ArtistRegistration(){
 const {user}=useAuth(),[step,setStep]=useState(0),[name,setName]=useState(''),[genre,setGenre]=useState(''),[bio,setBio]=useState(''),[url,setUrl]=useState(''),[confirm,setConfirm]=useState(false),[application,setApplication]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 const [loadFailed,setLoadFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setLoading(true);setLoadFailed(false);setError('');setApplication(null);if(!user?.id){setLoading(false);return;}withReadTimeout(base44.entities.ArtistApplication.filter({user_id:user.id},'-created_date',1)).then(result=>{const rows=applicationRows(result);if(alive)setApplication(rows[0]||null);}).catch(()=>{if(alive){setLoadFailed(true);setError('Could not load your application. Retry before applying.');}}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[user?.id,retry]);
 let validUrl=false;try{validUrl=new URL(url).protocol==='https:';}catch{}
 async function submit(){
 if(lock.current||loading||loadFailed||!confirm||!validUrl||name.trim().length<2||bio.trim().length<30)return;
 lock.current=true;setBusy(true);setError('');
 try{const current=await withReadTimeout(base44.auth.me());if(current.id!==user.id)throw Error('Your account changed. Refresh this page.');const existing=applicationRows(await withReadTimeout(base44.entities.ArtistApplication.filter({user_id:user.id,status:'pending'},'-created_date',1)));if(existing.length){setApplication(existing[0]);return;}const row=await base44.entities.ArtistApplication.create({user_id:user.id,artist_name:name.trim(),bio:bio.trim(),music_url:url.trim(),genre:genre.trim(),status:'pending'});if(!row?.id)throw Error('Application was not confirmed.');setApplication(row);}
 catch(e){setError(e.message||'Application could not be sent. Try again.');}finally{setBusy(false);lock.current=false;}
 }
 if(!user)return <div className="upload-redesign upload-empty"><h1>Join PUBLIC as an artist.</h1><p>Sign in before applying.</p><Link to="/profile">Go to profile</Link></div>;
 if(creatorType(user)==='admin'||creatorType(user)==='artist')return <div className="upload-redesign upload-empty"><Check size={35}/><h1>{creatorType(user)==='admin'?'You already have creator access.':'You’re an approved artist.'}</h1><Link className="upload-primary" to="/upload">Upload music</Link></div>;
 return <div className="upload-redesign"><header className="upload-new-header"><div><span className="upload-kicker">PUBLIC. FOR ARTISTS</span><h1>Your next chapter.</h1><p>Tell us about your music. An admin will review your application.</p></div><Mic2 size={35}/></header>
 {loading?<Loader2 className="animate-spin"/>:loadFailed?<div className="upload-publish-panel"><p>Your application status could not be checked.</p><button type="button" className="upload-primary mt-4" onClick={()=>setRetry(n=>n+1)}>Retry</button></div>:application?.status==='pending'?<div className="upload-publish-panel"><h2 className="text-2xl font-semibold">Your application is in review.</h2><p className="mt-4 text-sm text-muted-foreground">You’ll receive artist access and the white check after approval. You can keep listening while we review it.</p><Link className="upload-primary mt-6" to="/">Explore music</Link></div>:<><nav className="upload-step-nav" aria-label="Artist registration steps">{['Artist profile','Your music','Review'].map((title,i)=><button type="button" key={title} aria-current={i===step?'step':undefined} disabled={busy} onClick={()=>i<=step&&setStep(i)}><span>{i+1}</span>{title}</button>)}</nav>{application?.status==='rejected'&&<p role="status" className="mb-5 text-sm">Your previous application wasn’t approved. {application.review_note||'You can apply again with more information.'}</p>}
 <section className="upload-publish-panel"><div className="upload-track-fields">{step===0?<><label>Artist or stage name<input value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label><label>Genre<input value={genre} maxLength={100} onChange={e=>setGenre(e.target.value)}/></label></>:step===1?<><label className="col-span-2">About you<textarea className="w-full block mt-3 rounded-xl bg-transparent border p-3 min-h-36 text-sm" value={bio} maxLength={2000} onChange={e=>setBio(e.target.value)} placeholder="Your story, releases, and what you create. Minimum 30 characters."/></label><label className="col-span-2">Your music or official artist page<input type="url" value={url} maxLength={1000} onChange={e=>setUrl(e.target.value)} placeholder="https://…"/></label></>:<div className="col-span-2 space-y-4"><h2 className="text-2xl font-semibold">{name}</h2><p className="text-sm text-muted-foreground">{genre}</p><p className="text-sm whitespace-pre-wrap break-words">{bio}</p><p className="text-xs break-all">{url}</p><label className="upload-rights"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>I represent this artist and have permission to share their music. I understand that verification requires admin approval.</label></div>}</div></section>
 <footer className="upload-flow-footer"><button type="button" disabled={busy||step===0} className="upload-back" onClick={()=>setStep(s=>s-1)}><ArrowLeft size={16}/>Back</button>{step<2?<button type="button" className="upload-primary" disabled={step===0?name.trim().length<2:bio.trim().length<30||!validUrl} onClick={()=>setStep(s=>s+1)}>Continue<ArrowRight size={16}/></button>:<button type="button" className="upload-primary" disabled={busy||!confirm} onClick={submit}>{busy?'Submitting…':'Submit application'}</button>}</footer></>}
 {error&&<p role="alert" className="upload-inline-error">{error}</p>}<p className="upload-bottom-note">Uploader access is granted separately by an admin. Applying does not immediately enable uploads.</p></div>;
}
