import {useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,ArrowUp,Plus,Music2,Check,Loader2} from 'lucide-react';
import {useAuth} from '@/lib/AuthContext';
import {useUpload} from '@/context/UploadContext';
import {useUploadsEnabled} from '@/hooks/useUploadsEnabled';
import {AUDIO_ACCEPT,IMAGE_ACCEPT,isAudioFile} from '@/lib/audio-utils';
import UploadTrackEditor from '@/components/upload/UploadTrackEditor';
import DuplicateModal from '@/components/upload/DuplicateModal';
import './upload-studio.css';
export default function Upload(){
 const {user}=useAuth(),q=useUpload(),{loading,enabled}=useUploadsEnabled();
 const batchLock=useRef(false);
 const input=useRef(null),[drag,setDrag]=useState(false),[notice,setNotice]=useState(''),[filter,setFilter]=useState('all');
 const admin=user?.role==='admin',busy=q.items.some(t=>['uploading','enhancing'].includes(t.status));
 const completed=q.items.filter(t=>t.status==='done').length,ready=q.items.filter(t=>t.status==='ready'&&!t.detecting&&t.rightsConfirmed).length;
 const rows=q.items.filter(t=>filter==='complete'?t.status==='done':filter==='pending'?t.status!=='done':true);
 async function add(files){if(loading||!enabled&&!admin)return;const list=Array.from(files||[]);if(!list.some(isAudioFile)){setNotice('Choose an audio file. You can include artwork with it.');return;}setNotice('');setFilter('all');try{await q.addFiles(list);}catch{setNotice('Files could not be added. Please try again.');}}
 if(!loading&&!enabled&&!admin)return <div className="upload-redesign"><div className="upload-empty"><Music2 size={36}/><h1>Uploads are paused</h1><p>Come back soon to share your music.</p><Link to="/library">Go to library</Link></div></div>;
 return <div className="upload-redesign"><header className="upload-new-header"><div><span className="upload-kicker">PUBLIC. STUDIO</span><h1>Bring your sound.</h1><p>Your files. Your music. A place to share it.</p></div><Link to="/unfinished-uploads" className="upload-saved">Saved uploads <ArrowUpRight size={16}/></Link></header>
 <section className={'upload-drop-new'+(drag?' is-dragging':'')+(q.items.length?' is-compact':'')} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);add(e.dataTransfer.files);}} aria-label="Add audio files"><div className="upload-drop-symbol"><ArrowUp size={29}/></div><div><h2>{q.items.length?'Keep the music coming.':'Start with an audio file.'}</h2><p>Drop your tracks here, or choose files from your device.</p></div><button type="button" className="upload-primary" disabled={loading||busy} onClick={()=>input.current?.click()}><Plus size={17}/>{q.items.length?'Add tracks':'Choose files'}</button><small>Audio tags and MusicBrainz fill in matching details automatically.</small><input ref={input} type="file" multiple hidden accept={AUDIO_ACCEPT+','+IMAGE_ACCEPT} disabled={loading||busy} onChange={e=>{add(e.target.files);e.target.value='';}}/></section>
 {loading&&<p role="status" className="upload-note">Checking upload availability…</p>}{notice&&<p role="alert" className="upload-inline-error">{notice}</p>}
 {q.catalogError&&<div className="upload-warning" role="alert"><p>{q.catalogError}</p><button type="button" onClick={q.refreshDuplicates}>Retry check</button></div>}
 {q.items.length>0?<section className="upload-session"><header className="upload-session-header"><div><h2>Your session <span>{q.items.length}</span></h2><p>{completed?completed+' complete · ':''}{q.items.length-completed} to review</p></div><div className="upload-session-actions">{completed>0&&<button type="button" disabled={busy} onClick={q.clearFinished}>Clear completed</button>}<button type="button" className="upload-primary" disabled={busy||!ready||loading} onClick={async()=>{if(batchLock.current)return;batchLock.current=true;try{for(const item of q.items.filter(t=>t.status==='ready'&&!t.detecting&&t.rightsConfirmed))await q.uploadOne(item);}finally{batchLock.current=false;}}}>{busy?<Loader2 size={16} className="animate-spin"/>:<ArrowUp size={16}/>}Upload ready tracks</button></div></header><nav className="upload-tabs" aria-label="Filter uploads">{[['all','All tracks'],['pending','To review'],['complete','Completed']].map(([value,label])=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</nav><div className="upload-new-list">{rows.map(item=><UploadTrackEditor key={item.id} item={item} isAdmin={admin} disabled={loading} onChange={data=>q.patch(item.id,data)} onRemove={()=>q.remove(item.id)} onUpload={()=>q.uploadOne(item)}/>)}{!rows.length&&<div className="upload-empty"><Check size={25}/><p>Nothing here yet.</p></div>}</div></section>:<div className="upload-explainer"><div><span>01</span><h3>Add your tracks</h3><p>Choose one song or a whole collection.</p></div><div><span>02</span><h3>Make it yours</h3><p>Review the details and choose your artwork.</p></div><div><span>03</span><h3>Share your sound</h3><p>Save privately or {admin?'publish to PUBLIC.':'submit for review.'}</p></div></div>}
 <p className="upload-bottom-note">Only share music and media you own or have permission to distribute.</p>
 {q.dupes?.length>0&&<DuplicateModal tracks={q.dupes} onClose={()=>q.setDupes(null)} onRemove={id=>q.remove(id)}/>}</div>;
}
