import ScrollShelf from '@/components/ScrollShelf';
import {Link} from 'react-router-dom';
import {useRef} from 'react';
import {Music2,ChevronRight,Play,Pause,Loader2} from 'lucide-react';
import {useAuth} from '@/lib/AuthContext';
import {useSafety} from '@/context/SafetyContext';
import {usePlayer} from '@/context/PlayerContext';
import {useSharedTracks} from '@/hooks/useSharedTracks';
import {useCoverUrl} from '@/hooks/useCoverUrl';
import {reportActionError} from '@/lib/actionError';
import Avatar from '@/components/Avatar';
import './home-personal.css';
function SharedSong({note,track,queue}){
 const p=usePlayer(),cover=useCoverUrl(track?.cover_art_url),name=note.actor?.display_name||note.actor?.full_name||note.actor_name||'PUBLIC member';
 const lock=useRef(false);
 const active=p.currentTrack?.id===track?.id&&p.isPlaying;
 async function play(){if(!track||lock.current)return;lock.current=true;try{if(p.currentTrack?.id===track.id)p.togglePlay();else{p.setShuffle(false);await p.playTrackAt(queue,Math.max(0,queue.findIndex(t=>t.id===track.id)));}}catch(e){reportActionError(e,'This shared song could not play. Please retry.');}finally{lock.current=false;}}
 return <article className="shared-song"><button type="button" className="shared-song-cover" onClick={play} disabled={!track} aria-label={track?(active?'Pause ':'Play ')+track.title:'Song unavailable'}>{cover?<img src={cover} alt="" loading="lazy" onError={event=>{event.currentTarget.style.display='none';}}/>:<Music2 size={23}/>}<span>{active?<Pause size={12}/>:<Play size={12} fill="currentColor"/>}</span></button><div className="shared-song-info">{track?<Link className="shared-song-title" to={'/track/'+encodeURIComponent(track.id)}>{track.title}</Link>:<strong className="shared-song-title">Song unavailable</strong>}<p>{track?track.artist||track.uploader_name:'Not available in your current catalog'}</p>{note.actor_id?<Link className="shared-song-sender" to={'/profile/'+encodeURIComponent(note.actor_id)}><Avatar user={note.actor} size={21}/><span>From <strong>{name}</strong></span><ChevronRight size={12}/></Link>:<span className="shared-song-sender">From {name}</span>}{note.comment&&<p className="shared-song-note" title={note.comment}>{note.comment}</p>}</div></article>;
}
export default function SharedWithYou({catalog,catalogReady=true}){
 const {user}=useAuth(),{blocked}=useSafety(),{rows,loading,error,reload}=useSharedTracks(user?.id);
 if(!user?.id)return null;
 const map=new Map(catalog.filter(t=>!blocked.has(t.uploader_id)).map(t=>[t.id,t]));
 const visible=rows.filter(n=>!blocked.has(n.actor_id)).slice(0,15),queue=[...new Map(visible.map(n=>map.get(n.track_id)).filter(Boolean).map(t=>[t.id,t])).values()];
 return <section className="home-section home-shared-section"><div className="personal-section-heading"><h2>Shared with You</h2><Link to="/notifications?view=shared" aria-label="See all songs shared with you">See all<ChevronRight size={14}/></Link></div>{(!catalogReady||loading&&!rows.length)?<div className="personal-mix-note" role="status"><Loader2 size={18} className="animate-spin"/>Loading shared music…</div>:visible.length?<ScrollShelf className="shared-song-shelf" label="Songs shared with you">{visible.map(note=><SharedSong key={note.id} note={note} track={map.get(note.track_id)} queue={queue}/>)}</ScrollShelf>:!error&&<div className="shared-song-empty"><Music2 size={20}/><p>Songs people send you will appear here.</p></div>}{error&&<div className="personal-mix-note" role="alert">Shared music could not refresh. <button type="button" onClick={reload} disabled={loading}>Retry</button></div>}</section>;
}
