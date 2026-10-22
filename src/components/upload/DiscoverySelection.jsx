import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {useUpload} from '@/context/UploadContext';
import {AUDIO_ACCEPT} from '@/lib/audio-utils';
import {findDuplicateTracks} from '@/lib/duplicateCheck';
import {Link} from 'react-router-dom';

export default function DiscoverySelection(){
 const [params,setParams]=useSearchParams(),id=params.get('discovery')||'';
 const {user}=useAuth(),queue=useUpload(),input=useRef(null),request=useRef(0);
 const [state,setState]=useState({key:'',song:null,error:'',busy:false}),[nonce,setNonce]=useState(0);
 const key=[id,user?.id,user?.show_explicit,user?.adult_confirmed].join('|');
 useEffect(()=>{
  const seq=++request.current;
  if(!id||!user?.id)return;
  setState({key,song:null,error:'',busy:true});
  base44.functions.invoke('musicDiscovery',{id}).then(response=>{
   const song=response.data?.results?.[0];if(!song)throw Error('This song is unavailable.');
   if(seq===request.current)setState({key,song,error:'',busy:false});
  }).catch(e=>{if(seq===request.current)setState({key,song:null,error:e?.response?.data?.error||e.message||'Could not load this song.',busy:false});});
  return()=>{request.current++;};
 },[key,nonce]);
 if(!id)return null;
 const current=state.key===key,song=current?state.song:null;
 const queued=song&&queue.items.find(item=>findDuplicateTracks([item],song).some(hit=>hit._match_score>=.85));
 const cancel=()=>{request.current++;const next=new URLSearchParams(params);next.delete('discovery');setParams(next,{replace:true});};
 async function attach(file){
  if(!file||!song)return;
  const seq=++request.current;
  setState(s=>({...s,busy:true,error:''}));
  try{
   await queue.addFiles([file],song);
   if(seq===request.current)cancel();
  }catch(e){if(seq===request.current)setState(s=>({...s,busy:false,error:e.message||'Could not prepare your audio. Try again.'}));}
 }
 return <section className="discovery-selection" aria-label="Selected discovery song">
  <div className="flex items-start justify-between gap-3"><h2>{song?song.title:'Add discovered music'}</h2><button className="playlist-action" onClick={cancel}>Cancel</button></div>
  {song&&<p>{song.artist}{song.album_name?' · '+song.album_name:''}</p>}
  {current&&state.error&&<p role="alert">{state.error}<button className="playlist-action" onClick={()=>setNonce(n=>n+1)}>Retry</button></p>}
  {!current||state.busy?<p role="status">Preparing song…</p>:song&&queued?<p>This song is already in your upload queue.</p>:song&&<>
   <p>Attach the full audio file you have permission to share. We’ll fill in its title, artist, album, and available artwork for review.</p>
   {song.source_url&&<a href={song.source_url} target="_blank" rel="noopener noreferrer" className="playlist-action mr-2">View source</a>}
   <button className="playlist-action" onClick={()=>input.current?.click()}>Choose audio file</button>
  </>}
  <input type="file" ref={input} accept={AUDIO_ACCEPT} hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';attach(file);}}/>
  {song&&<Link to={'/search?q='+encodeURIComponent(song.title+' '+song.artist)} className="block text-xs underline mt-3">Check Public for this song</Link>}
 </section>;
}
