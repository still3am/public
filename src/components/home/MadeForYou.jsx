import {useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {Play,Pause,Shuffle,Plus,Check,Loader2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useAuth} from '@/lib/AuthContext';
import {useLibrary} from '@/context/LibraryContext';
import {usePlayer} from '@/context/PlayerContext';
import {useSafety} from '@/context/SafetyContext';
import {base44} from '@/api/base44Client';
import {getRecentPlays} from '@/lib/recentPlays';
import {buildPersonalMixes} from '@/lib/personalMixes';
import {reportActionError} from '@/lib/actionError';
import MotionGradient from '@/components/MotionGradient';
import TrackRow from '@/components/TrackRow';
import './home-personal.css';

function MixArt({mix,className='',children}){
 return <div className={'personal-mix-art '+className}><MotionGradient colors={mix.palette} speed={.65} pauseWhenCovered className="personal-mix-gradient"/><div className="personal-mix-shade"/><span className="personal-mix-brand">PUBLIC.</span><strong>{mix.title}</strong><span className="personal-mix-artists">{mix.artists}</span>{children}</div>;
}
function MixDetails({mix,uid,onClose}){
 const p=usePlayer(),{blocked}=useSafety(),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[saved,setSaved]=useState(null),[saveError,setSaveError]=useState('');
 const lock=useRef(false),saveLock=useRef(false),alive=useRef(true);
 useEffect(()=>()=>{alive.current=false;},[]);
 const tracks=mix.tracks.filter(t=>!blocked.has(t.uploader_id));
 const playing=p.isPlaying&&tracks.some(t=>t.id===p.currentTrack?.id);
 async function play(shuffle=false){
  if(lock.current||!tracks.length)return;lock.current=true;setBusy(true);
  try{if(!shuffle&&tracks.some(t=>t.id===p.currentTrack?.id)){p.togglePlay();return;}const queue=[...tracks];if(shuffle)for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}p.setShuffle(false);await p.playTrackAt(queue,0);}
  catch(e){reportActionError(e,'This mix could not start. Please retry.');}finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 async function save(){
  if(!uid||saveLock.current||saved||!tracks.length)return;saveLock.current=true;setSaving(true);setSaveError('');
  try{const playlist=await base44.entities.Playlist.create({name:mix.title,description:mix.subtitle+' Saved from Made for You on PUBLIC.',creator_id:uid,is_public:false,track_ids:tracks.map(t=>t.id),cover_art_url:''});if(!playlist?.id)throw Error('Save not confirmed');window.dispatchEvent(new Event('playlists:changed'));if(alive.current)setSaved(playlist.id);}
  catch{if(alive.current)setSaveError('This mix could not save. Please retry.');}finally{saveLock.current=false;if(alive.current)setSaving(false);}
 }
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="personal-mix-dialog" data-public-dialog><div className="personal-mix-dialog-scroll"><MixArt mix={mix} className="personal-mix-detail-art"/><div className="personal-mix-detail-body"><DialogTitle>{mix.title}</DialogTitle><DialogDescription>{mix.subtitle}</DialogDescription><p className="personal-mix-count">{tracks.length} songs · Made for you</p><div className="personal-mix-controls"><button type="button" className="chrome-button" disabled={busy||!tracks.length} onClick={()=>play()}>{busy?<Loader2 size={16} className="animate-spin"/>:playing?<Pause size={16}/>:<Play size={16} fill="currentColor"/>}{playing?'Pause':'Play'}</button><button type="button" className="playlist-action" aria-label="Shuffle mix" disabled={busy||!tracks.length} onClick={()=>play(true)}><Shuffle size={18}/></button>{uid&&<button type="button" className="playlist-action" disabled={saving||!!saved||!tracks.length} onClick={save}>{saving?<Loader2 size={16} className="animate-spin"/>:saved?<Check size={16}/>:<Plus size={16}/>}<span>{saved?'Saved':'Save playlist'}</span></button>}</div>{saveError&&<p role="alert" className="personal-mix-note">{saveError}</p>}{saved&&<Link className="personal-mix-saved-link" to={'/playlist/'+encodeURIComponent(saved)}>Open saved playlist</Link>}<div>{tracks.map((track,index)=><TrackRow key={track.id} track={track} index={index} queue={tracks} queueIndex={index}/>)}</div><p className="personal-mix-note">Mixes refresh with your tastes. Saving keeps a private copy of this song selection.</p></div></div></DialogContent></Dialog>;
}
export default function MadeForYou({catalog,genres}){
 const {user}=useAuth(),{ids}=useLibrary(),{blocked}=useSafety(),[recent,setRecent]=useState(()=>getRecentPlays()),[selected,setSelected]=useState(null);
 useEffect(()=>{const update=()=>setRecent(getRecentPlays());window.addEventListener('recentplays:change',update);return()=>window.removeEventListener('recentplays:change',update);},[]);
 const mixes=useMemo(()=>buildPersonalMixes(catalog.filter(t=>!blocked.has(t.uploader_id)),{recent,savedIds:ids,genres,uid:user?.id||''}),[catalog,recent,ids,genres,user?.id,blocked]);
 useEffect(()=>{if(selected&&!mixes.some(m=>m.id===selected))setSelected(null);},[mixes,selected]);
 if(!user?.id)return null;
 const current=mixes.find(m=>m.id===selected);
 return <section className="home-section home-personal-section"><div className="personal-section-heading"><h2>Made for You</h2><span>Your music, remixed</span></div>{mixes.length?<div className="personal-mix-shelf">{mixes.map(mix=><button type="button" key={mix.id} className="personal-mix-card" onClick={()=>setSelected(mix.id)} aria-label={'Open '+mix.title+' mix'}><MixArt mix={mix}/></button>)}</div>:<p className="personal-mix-note">Save a few songs or choose genres to start shaping your mixes.</p>}{current&&<MixDetails key={user.id+current.id} mix={current} uid={user.id} onClose={()=>setSelected(null)}/>}</section>;
}
