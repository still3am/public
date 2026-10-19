import {useEffect,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {Play,Pause,Shuffle,Disc3,Loader2,ChevronLeft,Share2,ListMusic,MoreHorizontal} from 'lucide-react';
import {usePlayer} from '@/context/PlayerContext';
import {useAuth} from '@/lib/AuthContext';
import {useSafety} from '@/context/SafetyContext';
import {useCoverUrl} from '@/hooks/useCoverUrl';
import {getPublishedTracks} from '@/lib/catalogCache';
import {linkedAlbumRecords} from '@/lib/albumData';
import {groupAlbums} from '@/lib/albumModel';
import {shareLink} from '@/lib/shareLink';
import {reportActionError} from '@/lib/actionError';
import {useToast} from '@/components/ui/use-toast';
import ArtistLinks from '@/components/ArtistLinks';
import TrackRow from '@/components/TrackRow';
import './track-editorial.css';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {useReleaseTheme} from '@/hooks/useReleaseTheme';
export default function AlbumDetail(){
 const {key}=useParams(),{user}=useAuth(),{blocked}=useSafety(),p=usePlayer(),nav=useNavigate(),{toast}=useToast();
 const [data,setData]=useState({key:null,album:null,error:false,loading:true}),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{
  let alive=true;setData({key:null,album:null,error:false,loading:true});
  (async()=>{try{const tracks=await getPublishedTracks(revision>0),records=await linkedAlbumRecords(tracks);const album=groupAlbums(tracks.filter(t=>!blocked.has(t.uploader_id)),records).find(a=>a.key===key);if(alive)setData({key,album,error:false,loading:false});}catch{if(alive)setData({key,album:null,error:true,loading:false});}})();
  return()=>{alive=false;};
 },[key,revision,user?.id,blocked]);
 useEffect(()=>{const refresh=()=>setRevision(n=>n+1);window.addEventListener('catalog:invalidate',refresh);return()=>window.removeEventListener('catalog:invalidate',refresh);},[]);
 const album=data.key===key?data.album:null,cover=useCoverUrl(album?.cover_art_url);
 const releaseTheme=useReleaseTheme(cover);
 useEffect(()=>setFailed(false),[cover]);
 if(data.loading||data.key!==key)return <div className="py-20 grid place-items-center" role="status" aria-label="Loading album"><Loader2 className="animate-spin"/></div>;
 if(data.error)return <div className="py-20 text-center"><p>This album could not load.</p><button className="playlist-action mt-4" onClick={()=>setRevision(n=>n+1)}>Retry</button></div>;
 if(!album)return <div className="py-20 text-center"><h1 className="text-2xl font-bold">Album unavailable</h1><p className="text-sm text-muted-foreground mt-3">No available songs have this album metadata yet.</p><Link to="/search" className="block mt-4 underline">Find music</Link></div>;
 const albumQueue=album.tracks.map(t=>({...t,album_id:'metadata:'+album.key}));
 const sameQueue=p.queue?.length===album.tracks.length&&album.tracks.every((t,i)=>p.queue[i]?.id===t.id),playing=sameQueue&&p.isPlaying;
 async function play(shuffle=false){
  if(busy)return;setBusy(true);
  try{if(!shuffle&&sameQueue){p.togglePlay();return;}const queue=[...albumQueue];if(shuffle)for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}p.setShuffle(false);await p.playTrackAt(queue,0);}catch(e){reportActionError(e,'This album could not start. Please retry.');}finally{setBusy(false);}
 }
 return <div className="track-page track-editorial album-page release-page mx-auto" style={releaseTheme}>
  <div className="release-toolbar"><button className="release-round" aria-label="Back" onClick={()=>window.history.state?.idx>0?nav(-1):nav('/artist?name='+encodeURIComponent(album.artist))}><ChevronLeft/></button><div className="release-toolbar-actions"><button className="release-round" aria-label="Share album" onClick={async()=>{try{if(await shareLink({title:album.title+' on PUBLIC',url:window.location.href})==='copied')toast({title:'Album link copied'});}catch(e){reportActionError(e,'Album link could not be shared.');}}}><Share2 size={21}/></button><DropdownMenu><DropdownMenuTrigger asChild><button className="release-round" aria-label="Album options"><MoreHorizontal size={23}/></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>{p.addManyToQueue(albumQueue);toast({title:"Album added to queue"});}}><ListMusic size={17} className="mr-2"/>Add to queue</DropdownMenuItem><DropdownMenuItem disabled={busy} onSelect={()=>play(true)}><Shuffle size={17} className="mr-2"/>Shuffle album</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>
  <section className="release-header release-header-full"><div className="release-art">{cover&&!failed?<img src={cover} alt={album.title+' cover'} onError={()=>setFailed(true)}/>:<Disc3 size={64}/>}</div><div className="track-release-info"><h1>{album.title}</h1><div className="release-artist"><ArtistLinks artist={album.artist} maxShown={8}/></div><p className="release-subtitle">{[album.tracks.find(t=>t.genre)?.genre||null,album.year||null].filter(Boolean).join(' · ')}</p><div className="release-play-controls"><button className="release-add-button release-shuffle-button" disabled={busy} aria-label="Shuffle album" onClick={()=>play(true)}><Shuffle size={21}/></button><button className="release-play-button" disabled={busy} onClick={()=>play()}>{playing?<Pause fill="currentColor" size={20}/>:<Play fill="currentColor" size={20}/>} {playing?'Pause':'Play'}</button><button className="release-add-button" aria-label="Add album to queue" onClick={()=>{p.addManyToQueue(albumQueue);toast({title:"Album added to queue"});}}><ListMusic size={22}/></button></div></div></section>
  <section className="release-song-list" aria-label="Album songs">{album.tracks.map((track,i)=><TrackRow key={track.id} track={track} index={i} showArt={false} queue={albumQueue} queueIndex={i}/>)}</section><p className="text-xs text-muted-foreground">{album.tracks.length} {album.tracks.length===1?'song':'songs'}{album.duration>0?' · '+Math.max(1,Math.round(album.duration/60))+' minutes':''}</p>
 </div>;
}
