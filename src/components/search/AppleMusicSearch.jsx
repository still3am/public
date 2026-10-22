import {useEffect,useRef,useState} from 'react';
import {Play,Pause,Music2,Loader2} from 'lucide-react';
import {useAuth} from '@/lib/AuthContext';
import {usePlayer} from '@/context/PlayerContext';
import {loadAppleMusic,searchAppleMusic,appleArtwork,disconnectAppleMusic,authorizeAppleMusic} from '@/lib/appleMusic';
import './apple-music-search.css';

/** @param {any} props */
export default function AppleMusicSearch({query=''}){
 const {user}=useAuth(),{pausePlayback,isPlaying:publicPlaying}=usePlayer();
 const musicRef=useRef(null),generation=useRef(0),pauseRef=useRef(pausePlayback);
 pauseRef.current=pausePlayback;
 const [ready,setReady]=useState(false),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[setup,setSetup]=useState('');
 const [result,setResult]=useState({key:'',songs:[],loading:false}),[now,setNow]=useState(null);
 const [playing,setPlaying]=useState(false),[nonce,setNonce]=useState(0);
 const key=[user?.id,user?.show_explicit,user?.adult_confirmed,query.trim(),nonce].join('|');
 useEffect(()=>{
  const seq=++generation.current;let live=true,owned=null;
  setReady(false);setConnected(false);setResult({key:'',songs:[],loading:false});setNow(null);setPlaying(false);setError('');setSetup('');setBusy(false);
  if(!user?.id)return;
  loadAppleMusic().then(async music=>{
   if(!live||seq!==generation.current)return;
   await disconnectAppleMusic();
   if(!live||seq!==generation.current)return;
   owned=music;musicRef.current=music;
   music.addEventListener('playbackStateDidChange',onPlayback);
   setReady(true);
  }).catch(()=>{if(live)setSetup('Apple Music is not available yet.');});
  function onPlayback(){
   if(!live)return;
   const active=!!owned?.isPlaying;setPlaying(active);
   if(active)pauseRef.current();
  }
  return()=>{
   live=false;generation.current++;musicRef.current=null;
   if(owned){owned.removeEventListener('playbackStateDidChange',onPlayback);disconnectAppleMusic().catch(()=>{});}
  };
 },[user?.id]);
 useEffect(()=>{if(publicPlaying&&musicRef.current){Promise.resolve(musicRef.current.pause()).catch(()=>{});setPlaying(false);}},[publicPlaying]);
 useEffect(()=>{
  let live=true;
  if(!ready||!query.trim()){setResult({key,songs:[],loading:false});return;}
  setResult({key,songs:[],loading:true});setError('');
  const timer=setTimeout(async()=>{
   try{const songs=await searchAppleMusic(musicRef.current,query,user);if(live)setResult({key,songs,loading:false});}
   catch{if(live){setResult({key,songs:[],loading:false});setError('Apple Music search could not load. Please retry.');}}
  },500);
  return()=>{live=false;clearTimeout(timer);};
 },[ready,key]);
 async function connect(){
  const music=musicRef.current;if(!music||busy)return;
  const seq=generation.current;setBusy(true);setError('');
  try{
   await authorizeAppleMusic(music);
   if(seq===generation.current)setConnected(!!music.isAuthorized);
  }catch{if(seq===generation.current)setError('Apple Music was not connected. Allow the Apple sign-in window and try again.');}
  finally{if(seq===generation.current)setBusy(false);}
 }
 async function disconnect(){
  const seq=generation.current;setBusy(true);
  try{await disconnectAppleMusic();if(seq===generation.current){setConnected(false);setNow(null);setPlaying(false);}}
  catch{if(seq===generation.current)setError('Apple Music could not disconnect. Try again.');}
  finally{if(seq===generation.current)setBusy(false);}
 }
 async function play(song){
  const music=musicRef.current;if(!music?.isAuthorized||busy)return;
  const seq=generation.current;setBusy(true);setError('');pausePlayback();
  try{
   if(now?.id!==song.id)await music.setQueue({song:song.id});
   if(seq!==generation.current)return;
   await music.play();
   if(seq===generation.current){setNow(song);setPlaying(true);}
  }catch{if(seq===generation.current)setError('Apple Music could not play this song. Check your subscription and the song’s availability.');}
  finally{if(seq===generation.current)setBusy(false);}
 }
 async function pause(){
  try{await musicRef.current?.pause();setPlaying(false);}catch{setError('Playback could not pause. Try again.');}
 }
 const songs=result.key===key?result.songs:[];
 return <section className="apple-music-search" aria-label="Apple Music">
  <header><div><h2><Music2 size={22}/>Apple Music</h2><p>Search Apple’s catalog. Connect your own Apple Music subscription to listen.</p></div>
   {ready&&user&&(connected?<button className="playlist-action" disabled={busy} onClick={disconnect}>Disconnect</button>:<button className="playlist-action" disabled={busy} onClick={connect}>{busy?'Connecting…':'Connect Apple Music'}</button>)}
  </header>
  {!user?<p>Sign in to Public to connect Apple Music.</p>:setup?<p>{setup}{user.role==='admin'&&' Complete Public’s MusicKit developer setup to enable it.'}</p>:!ready?<p role="status"><Loader2 size={16} className="animate-spin"/>Preparing Apple Music…</p>:!query.trim()?<p>Search above to find songs on Apple Music.</p>:result.key!==key||result.loading?<p role="status">Searching Apple Music…</p>:!songs.length&&!error?<p>No Apple Music matches.</p>:null}
  {error&&<div role="alert"><p>{error}</p><button className="playlist-action" onClick={()=>setNonce(n=>n+1)}>Refresh search</button></div>}
  {now&&<div className="apple-music-now"><span>{now.attributes.name} · {now.attributes.artistName}</span><button className="playlist-action" disabled={busy} onClick={()=>playing?pause():play(now)}>{playing?<Pause size={18}/>:<Play size={18}/>}<span>{playing?'Pause':'Resume'}</span></button></div>}
  {songs.length>0&&<ul>{songs.map(song=><li key={song.id}>
   {appleArtwork(song)&&<img src={appleArtwork(song)} alt="" loading="lazy"/>}
   <div><strong>{song.attributes.name}{song.attributes.contentRating==='explicit'&&<small aria-label="Explicit"> E</small>}</strong><span>{song.attributes.artistName}</span></div>
   <button className="playlist-action" disabled={busy||!connected||!song.attributes.playParams} onClick={()=>play(song)} aria-label={'Play '+song.attributes.name+' on Apple Music'}><Play size={16}/>Listen</button>
  </li>)}</ul>}
 </section>;
}
