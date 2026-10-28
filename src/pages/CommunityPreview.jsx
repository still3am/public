import {useEffect,useMemo,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowLeft,ArrowRight,Check,Music2,Pause,Play} from 'lucide-react';
import {buildCommunityPreviews} from '@/lib/communityPreview';
import {AVATAR_PRESETS} from '@/lib/avatarPresets';
import {BANNER_PRESETS} from '@/lib/bannerPresets';
import {getPublishedTracks} from '@/lib/catalogCache';
import {usePlayer} from '@/context/PlayerContext';
import {useSafety} from '@/context/SafetyContext';
import {useAuth} from '@/lib/AuthContext';
import {useCoverUrl} from '@/hooks/useCoverUrl';
import Avatar from '@/components/Avatar';
import ProfileMedia from '@/components/ProfileMedia';
import MotionGradient from '@/components/MotionGradient';
import '@/components/community-preview.css';

function PreviewSong({track,index,onPlay,playing}){
 const cover=useCoverUrl(track.cover_art_url);
 return <button type="button" className="community-preview-song" onClick={onPlay} aria-label={(playing?'Pause ':'Play ')+track.title}>
  <span className="community-preview-art">{cover?<img src={cover} alt="" loading="lazy"/>:<Music2 size={24}/>}<small>{String(index+1).padStart(2,'0')}</small><i aria-hidden="true">{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</i></span>
  <strong>{track.title}</strong><span>{track.artist||'PUBLIC'}</span>
 </button>;
}
export default function CommunityPreview(){
 const [params,setParams]=useSearchParams(),[catalog,setCatalog]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const player=usePlayer(),{blocked}=useSafety(),{user}=useAuth();
 useEffect(()=>{let alive=true;setLoading(true);setError('');getPublishedTracks().then(rows=>{if(alive)setCatalog(rows);}).catch(()=>{if(alive)setError('Music couldn’t load. Please retry.');}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[revision]);
 const profiles=useMemo(()=>buildCommunityPreviews(catalog,{blocked,showExplicit:user?.show_explicit!==false}),[catalog,blocked,user?.show_explicit]);
 const selected=profiles.find(p=>p.id===params.get('profile'))||profiles[0];
 const avatar=AVATAR_PRESETS.find(a=>a.id===selected.avatar),banner=BANNER_PRESETS.find(b=>b.id===selected.banner);
 async function play(track,index){
  try{setError('');if(player.currentTrack?.id===track.id)await player.togglePlay();else await player.playTrackAt(selected.songs,index);}
  catch{setError('This song couldn’t start. Please try another song.');}
 }
 return <div className="community-preview-page">
  <MotionGradient key={selected.id} colors={selected.colors} speed={.65} className="community-preview-background"/>
  <header className="community-preview-heading"><Link to="/" aria-label="Back to PUBLIC"><ArrowLeft size={20}/></Link><div><p>PUBLIC · DESIGN PREVIEW</p><h1>Your people. Your sound.</h1><span>Five profiles to explore. No changes to real accounts.</span></div></header>
  <div className="community-preview-layout">
   <nav className="community-preview-people" aria-label="Choose a preview profile">{profiles.map(profile=>{const a=AVATAR_PRESETS.find(row=>row.id===profile.avatar);return <button key={profile.id} type="button" aria-pressed={selected.id===profile.id} onClick={()=>{setParams({profile:profile.id},{replace:true});setError('');}}><Avatar user={{avatar_url:a?.url,display_name:profile.name}} size={48} motion/><span><strong>{profile.name}</strong><small>@{profile.handle}</small></span>{selected.id===profile.id?<Check size={17}/>:<ArrowRight size={17}/>}</button>;})}</nav>
   <section className="community-preview-profile" aria-label={selected.name+' profile'}>
    <div className="community-preview-banner">{banner&&<ProfileMedia key={selected.id} src={banner.url} gifSrc={banner.gifUrl} videoSrc={banner.videoUrl} style={{width:'100%',height:'100%'}}/>}<span/></div>
    <section className="community-preview-identity"><Avatar user={{avatar_url:avatar?.url,display_name:selected.name}} size={104} motion/><div><p>@{selected.handle}</p><h2>{selected.name}</h2><p>{selected.bio}</p></div></section>
    <div className="community-preview-taste">{selected.genres.slice(0,3).map(genre=><span key={genre}>{genre}</span>)}</div>
    {selected.featured&&<button type="button" className="community-preview-featured" onClick={()=>play(selected.featured,0)} aria-label={(player.currentTrack?.id===selected.featured.id&&player.isPlaying?'Pause ':'Play ')+selected.featured.title}><span>{player.currentTrack?.id===selected.featured.id&&player.isPlaying?<Pause size={20}/>:<Play size={20} fill="currentColor"/>}</span><div><small>PROFILE SONG</small><strong>{selected.featured.title}</strong><p>{selected.featured.artist}</p></div></button>}
    <section className="community-preview-rotation"><header><h3>Top 8</h3><span>On repeat</span></header>{loading?<p role="status">Loading music…</p>:<div className="community-preview-songs">{selected.songs.map((track,index)=><PreviewSong key={track.id} track={track} index={index} onPlay={()=>play(track,index)} playing={player.currentTrack?.id===track.id&&player.isPlaying}/>)}</div>}{!loading&&!selected.songs.length&&!error&&<p>No available songs right now.</p>}</section>
    {error&&<div className="community-preview-error" role="status"><p>{error}</p>{!catalog.length&&<button type="button" onClick={()=>setRevision(v=>v+1)}>Retry</button>}</div>}
   </section>
  </div>
 </div>;
}
