import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ExternalCatalog from '@/components/catalog/MusicBrainzCatalog';
import { UploadCloud, Loader2, CheckCheck, Ban, ExternalLink, ArrowUpRight, Plus, AlertCircle } from 'lucide-react';
import { useUploadsEnabled } from '@/hooks/useUploadsEnabled';
import { useAuth } from '@/lib/AuthContext';
import FileDropZone from '@/components/upload/FileDropZone';
import UploadItem from '@/components/upload/UploadItem';
import DuplicateModal from '@/components/upload/DuplicateModal';
import { useUpload } from '@/context/UploadContext';
import { AUDIO_ACCEPT, IMAGE_ACCEPT, isAudioFile } from '@/lib/audio-utils';
import './upload.css';

export default function Upload() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const inputRef = useRef(null);
  const [filter,setFilter] = useState('all');
  const [catalogQuery,setCatalogQuery] = useState('');
  const location = useLocation();
  const [fileNotice,setFileNotice] = useState('');
  const q = useUpload();
  const { loading: loadingSwitch, enabled: uploadsEnabled } = useUploadsEnabled();
  const readyCount = q.items.filter(it=>it.status==='ready').length;
  const completed = q.items.filter(it=>it.status==='done').length;
  const needsAttention = it=>it.status!=='done' && (!!it.error || it.status==='error');
  const attentionCount = q.items.filter(needsAttention).length;
  const busy = q.items.some(it=>['uploading','enhancing'].includes(it.status));
  const shownItems = q.items.filter(it=>filter==='done'?it.status==='done':filter==='attention'?needsAttention(it):true);
  const pending = q.items.length-completed;
  async function addFiles(fileList) {
    const files=Array.from(fileList || []);
    if (!files.some(isAudioFile)) {setFileNotice('Choose at least one audio file. Artwork can be selected together with your tracks.');return;}
    setFilter('all');setFileNotice('');
    try {await q.addFiles(files);} catch {setFileNotice('Those files could not be added. Please select them again.');}
  }
  if (!loadingSwitch && !uploadsEnabled && !isAdmin) return <div className="upload-page upload-studio"><div className="upload-paused"><Ban size={32}/><h1>Uploads are paused</h1><p>New uploads are temporarily closed. Check back soon.</p><Link to="/library" className="playlist-action">Go to library</Link></div></div>;
  return <div className="upload-page upload-studio">
    <header className="upload-studio-header">
      <div><span className="upload-eyebrow">YOUR MUSIC, ON PUBLIC.</span><h1>Upload music</h1><p>Bring your tracks. Make them yours.</p></div>
      <Link to="/unfinished-uploads" className="upload-saved-link">Saved uploads <ArrowUpRight size={15}/></Link>
    </header>
    <ol className="upload-steps" aria-label="Upload steps"><li><span>1</span>Add audio</li><li><span>2</span>Review details</li><li><span>3</span>{isAdmin?'Save or publish':'Save or submit'}</li></ol>
    <div className="upload-workspace">
      <div>
        <FileDropZone onFiles={addFiles} inputRef={inputRef} compact={q.items.length>0} disabled={loadingSwitch}/>
        <input ref={inputRef} type="file" aria-label="Select audio and optional artwork" accept={`${AUDIO_ACCEPT},${IMAGE_ACCEPT}`} multiple className="hidden" disabled={loadingSwitch} onChange={e=>{if(e.target.files?.length)addFiles(e.target.files);e.target.value='';}}/>
        {loadingSwitch && <p className="upload-file-notice" role="status">Checking upload availability…</p>}
        {fileNotice && <p className="upload-file-notice" role="alert"><AlertCircle size={15}/>{fileNotice}</p>}
      </div>
      <aside className="upload-helpers" aria-label="Upload help">
        <section className="upload-helper-card"><span className="upload-eyebrow">FROM A LINK</span><h2>Have a Spotify link?</h2><p>Open Spotdown, then come back and select your audio file.</p><a href="https://spotdown.org/en2" target="_blank" rel="noopener noreferrer" className="upload-helper-link">Open Spotdown <ExternalLink size={14}/></a><small>Opens an external website.</small></section>
        <section className="upload-helper-note"><h2>A little help with the details</h2><p>We read tags and artwork from your files. MusicBrainz automatically fills missing details when the recording matches. Use “Find catalog metadata” to review another match.</p><p>{isAdmin?'Tracks with an artist, genre, and artwork can be published.':'Tracks with an artist, genre, and artwork can be submitted for review.'} You can also save them privately to your library.</p></section>
      </aside>
    </div>
    <section className="upload-catalog-search" aria-label="Find external music">
      <label htmlFor="upload-catalog-query">Search MusicBrainz</label>
      <div className="upload-catalog-field"><input id="upload-catalog-query" type="search" value={catalogQuery} maxLength={200} onChange={e=>setCatalogQuery(e.target.value)} placeholder="Search a song title and artist…" autoComplete="off"/><button type="button" onClick={()=>setCatalogQuery('')} disabled={!catalogQuery} aria-label="Clear external catalog search">Clear</button></div>
      <ExternalCatalog query={catalogQuery} active={location.pathname === '/upload'} allowExplicit={user?.show_explicit === true && user?.adult_confirmed === true}/>
    </section>
    {q.catalogError && <div role="alert" className="upload-catalog-warning"><AlertCircle size={17}/><div>{q.catalogError}<button type="button" onClick={q.refreshDuplicates}>Retry check</button></div></div>}
    {q.items.length>0 && <section className="upload-queue-section" aria-label="Upload queue">
      <div className="upload-queue-toolbar">
        <div><h2>Your tracks <span>{q.items.length}</span></h2><p aria-live="polite">{busy?'Uploading your music…':`${pending} remaining${completed?` · ${completed} completed`:''}`}</p></div>
        <div className="upload-queue-actions"><button type="button" className="upload-add-more" onClick={()=>inputRef.current?.click()} disabled={loadingSwitch}><Plus size={16}/><span>Add files</span></button>{readyCount>0 && <button type="button" onClick={q.uploadAll} disabled={busy || loadingSwitch} className="upload-batch-action">{busy?<Loader2 size={15} className="animate-spin"/>:<UploadCloud size={15}/>}Upload all <span>{readyCount}</span></button>}</div>
      </div>
      <div className="upload-queue-filters"><div aria-label="Filter queued tracks">{[['all','All',q.items.length],['attention','Needs attention',attentionCount],['done','Completed',completed]].map(([key,label,count])=><button key={key} type="button" aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}<span>{count}</span></button>)}</div>{completed>0 && <button type="button" className="upload-clear" onClick={()=>{q.clearFinished();if(filter==='done')setFilter('all');}}>Clear completed</button>}</div>
      <div className="upload-track-list">{shownItems.length?shownItems.map(item=><UploadItem key={item.id} item={item} isAdmin={isAdmin} onChange={data=>q.patch(item.id,data)} onRemove={()=>q.remove(item.id)} onUpload={()=>q.uploadOne(item)} disabled={item.status==='analyzing' || loadingSwitch}/>):<div className="upload-filter-empty"><CheckCheck size={24}/><p>{filter==='attention'?'No upload errors to review.':'No completed uploads yet.'}</p><button type="button" onClick={()=>setFilter('all')}>Show all tracks</button></div>}</div>
    </section>}
    <p className="upload-permission-note">Only upload audio, artwork, and videos you own or have permission to share.</p>
    {q.dupes?.length>0 && <DuplicateModal tracks={q.dupes} onClose={()=>q.setDupes(null)} onRemove={id=>q.remove(id)}/>}
  </div>;
}
