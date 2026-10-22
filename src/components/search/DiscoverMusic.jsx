import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Loader2,Music2,Plus} from 'lucide-react';
import {searchDiscoveredMusic} from '@/lib/musicDiscovery';
import {useAuth} from '@/lib/AuthContext';
import {useUpload} from '@/context/UploadContext';
import {findDuplicateTracks} from '@/lib/duplicateCheck';
import './music-discovery.css';

/** @param {any} props */
export default function DiscoverMusic({query='',tracks=[],searchable=false}) {
 const {user}=useAuth(),queue=useUpload();
 const [input,setInput]=useState(''),[nonce,setNonce]=useState(0),[source,setSource]=useState('deezer');
 const term=(searchable?input:query).trim();
 const [state,setState]=useState({key:'',songs:[],busy:false,error:''});
 const key=[user?.id,user?.show_explicit,user?.adult_confirmed,term,nonce,source].join('|');
 useEffect(()=>{
  let current=true;
  if(!user?.id||term.length<2){setState({key,songs:[],busy:false,error:''});return;}
  setState({key,songs:[],busy:true,error:''});
  const timer=setTimeout(async()=>{
   try{
    const songs=await searchDiscoveredMusic(term,user,source);
    if(current)setState({key,songs,busy:false,error:''});
   }catch(e){if(current)setState({key,songs:[],busy:false,error:e?.response?.data?.error||'Discover more is unavailable. Try again.'});}
  },600);
  return()=>{current=false;clearTimeout(timer);};
 },[key]);
 const visible=state.key===key;
 const songs=visible?state.songs:[];
 return <section className="music-discovery" aria-label="Discover more music">
  <header><div><h2>{searchable?'Find music':'Discover more'}</h2><p>{source==='archive'?'Import complete tracks from independent music collections.':'Find a song, then add your audio to Public.'}</p></div></header>
  <div className="discovery-sources" aria-label="Music source"><button aria-pressed={source==='deezer'} onClick={()=>setSource('deezer')}>Song search</button><button aria-pressed={source==='archive'} onClick={()=>setSource('archive')}>Full tracks</button></div>
  {searchable&&<input className="discovery-query" type="search" value={input} onChange={e=>setInput(e.target.value)} placeholder="Search songs, artists, or albums" aria-label="Find music to upload" maxLength={100}/>}
  {!user?.id?<p className="discovery-note">Sign in to find and add music.</p>:term.length<2?<p className="discovery-note">Enter at least two characters to search.</p>:
  !visible||state.busy?<p className="discovery-note" role="status"><Loader2 size={16} className="animate-spin"/>Finding more music…</p>:
  state.error?<div className="discovery-note" role="alert">{state.error}<button className="playlist-action" onClick={()=>setNonce(n=>n+1)}>Retry</button></div>:
  !songs.length?<p className="discovery-note">{source==='archive'?'No downloadable tracks found in this collection. Try an independent artist, album, or genre.':'No external matches. Try another song or artist.'}</p>:
  <ul className="discovery-list">{songs.map(song=>{
   const existing=song.existing?.status==='published'?song.existing:findDuplicateTracks(tracks,song).find(hit=>hit._match_score>=0.85);
   const queued=queue?.items?.find(item=>findDuplicateTracks([item],song).some(hit=>hit._match_score>=0.85));
   const pending=queued?.status==='done'&&queued?.releaseStatus==='pending';
   return <li key={song.id}>
    {song.cover_art_url?<img src={song.cover_art_url} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span className="discovery-placeholder"><Music2 size={22}/></span>}
    <div className="discovery-details"><strong>{song.title}{song.explicit&&<span className="discovery-explicit" aria-label="Explicit">E</span>}</strong><span>{song.artist||'Unknown artist'}</span>{song.album_name&&<small>{song.album_name}</small>}{song.audio_available&&<small>Full MP3 · Rating unverified</small>}</div>
    {song.existing?.status==='pending'?<span className="discovery-status">Awaiting approval</span>:existing?<Link className="playlist-action discovery-action" to={'/track/'+existing.id}>On Public</Link>:
     queued?<span className="discovery-status">{pending?'Awaiting approval':queued.status==='done'?'Submitted':'In upload queue'}</span>:
     <Link className="playlist-action discovery-action" to={'/upload?discovery='+encodeURIComponent(song.id)} aria-label={'Add '+song.title+' to Public'}><Plus size={15}/><span>{song.audio_available?'Import full track':'Add to Public'}</span></Link>}
   </li>;
  })}</ul>}
  {songs.length>0&&<p className="discovery-note discovery-attribution">{source==='archive'?'Full tracks from Internet Archive’s netlabel collections. Review the source license before importing.':'Metadata from Deezer. These songs become playable on Public after audio is uploaded and approved.'}</p>}
 </section>;
}
