import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {getDiscoveredSong} from '@/lib/musicDiscovery';
import {downloadArchiveSong} from '@/lib/archiveMusic';
import {useAuth} from '@/lib/AuthContext';
import {useUpload} from '@/context/UploadContext';
import {AUDIO_ACCEPT} from '@/lib/audio-utils';
import {findDuplicateTracks} from '@/lib/duplicateCheck';

export default function DiscoverySelection(){
 const [params,setParams]=useSearchParams(),id=params.get('discovery')||'';
 const {user}=useAuth(),queue=useUpload(),input=useRef(null),request=useRef(0),download=useRef(null);
 const [state,setState]=useState({key:'',song:null,error:'',busy:false});
 const [nonce,setNonce]=useState(0),[reviewed,setReviewed]=useState(''),[progress,setProgress]=useState('');
 const key=[id,user?.id,user?.show_explicit,user?.adult_confirmed].join('|');
 useEffect(()=>{
  const seq=++request.current;
  download.current?.abort();download.current=null;setReviewed('');setProgress('');
  if(!id||!user?.id)return;
  setState({key,song:null,error:'',busy:true});
  getDiscoveredSong(id,user).then(song=>{
   if(seq===request.current)setState({key,song,error:'',busy:false});
  }).catch(e=>{if(seq===request.current)setState({key,song:null,error:e.message||'Could not load this song.',busy:false});});
  return()=>{request.current++;download.current?.abort();};
 },[key,nonce]);
 if(!id)return null;
 const current=state.key===key,song=current?state.song:null;
 const queued=song&&queue.items.find(item=>findDuplicateTracks([item],song).some(hit=>hit._match_score>=.85));
 const cancel=()=>{
  request.current++;download.current?.abort();download.current=null;
  const next=new URLSearchParams(params);next.delete('discovery');setParams(next,{replace:true});
 };
 async function attach(file){
  if(!file||!song)return;
  const seq=++request.current;
  setState(s=>({...s,busy:true,error:''}));setProgress('Preparing your upload…');
  try{await queue.addFiles([file],song);if(seq===request.current)cancel();}
  catch(e){if(seq===request.current)setState(s=>({...s,busy:false,error:e.message||'Could not prepare your audio. Try again.'}));}
 }
 async function importFullTrack(){
  if(!song?.audio_available||reviewed!==key||download.current||queued)return;
  const controller=new AbortController();download.current=controller;
  const seq=++request.current;
  setState(s=>({...s,busy:true,error:''}));setProgress('Downloading the full MP3…');
  try{
   const {file,song:resolved}=await downloadArchiveSong(song,{signal:controller.signal,onProgress:(bytes,total)=>{
    if(seq===request.current)setProgress(total?'Downloading '+Math.min(100,Math.round(bytes/total*100))+'%':'Downloaded '+(bytes/1048576).toFixed(1)+' MB');
   }});
   if(seq!==request.current||controller.signal.aborted)return;
   setProgress('Checking the full audio and preparing review…');
   await queue.addFiles([file],resolved);
   if(seq===request.current)cancel();
  }catch(e){if(seq===request.current)setState(s=>({...s,busy:false,error:e.name==='AbortError'?'Import cancelled.':e.message||'Full-track import failed. Try again.'}));}
  finally{if(download.current===controller)download.current=null;}
 }
 return <section className="discovery-selection" aria-label="Selected discovery song">
  <div className="flex items-start justify-between gap-3"><h2>{song?song.title:'Add discovered music'}</h2><button className="playlist-action" onClick={cancel}>Cancel</button></div>
  {song&&<p>{song.artist}{song.album_name?' · '+song.album_name:''}</p>}
  {current&&state.error&&<p role="alert">{state.error}{!song&&<button className="playlist-action" onClick={()=>setNonce(n=>n+1)}>Retry</button>}</p>}
  {!current||state.busy?<p role="status" aria-live="polite">{progress||'Preparing song…'}</p>:
   song?.existing?<p>{song.existing.status==='pending'?'Your submission is awaiting approval':<>This song is already <Link className="underline" to={'/track/'+song.existing.id}>on Public</Link>.</>}</p>:
   song&&queued?<p>This song is already in your upload queue.</p>:song&&<>
    <p>{song.audio_available?'Import the complete MP3 into your upload queue, then review its details and content rating before submitting.':'Attach the full audio file you have permission to share. We’ll fill in its details for review.'}</p>
    {song.source_url&&<a href={song.source_url} target="_blank" rel="noopener noreferrer" className="playlist-action mr-2">View source</a>}
    {song.source_license_url&&<a href={song.source_license_url} target="_blank" rel="noopener noreferrer" className="playlist-action">Source license</a>}
    {song.audio_available&&<>
     <label className="discovery-rights"><input type="checkbox" checked={reviewed===key} onChange={e=>setReviewed(e.target.checked?key:'')}/><span>I reviewed the source and license and have permission to share this recording and artwork on Public.</span></label>
     <button className="playlist-action" disabled={reviewed!==key} onClick={importFullTrack}>Import full track</button>
    </>}
    <button className="playlist-action ml-2" onClick={()=>input.current?.click()}>Choose audio file</button>
   </>}
  <input type="file" ref={input} accept={AUDIO_ACCEPT} hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';attach(file);}}/>
  {song&&<Link to={'/search?q='+encodeURIComponent(song.title+' '+song.artist)} className="block text-xs underline mt-3">Check Public for this song</Link>}
 </section>;
}
