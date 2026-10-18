import { Play, Pause, Shuffle, Music2 } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { useCoverUrl } from "@/hooks/useCoverUrl";
export default function CollectionSpotlight({title,description,tracks,eyebrow}) {
 const player=usePlayer(),track=tracks[0],cover=useCoverUrl(track?.cover_art_url);
 const active=tracks.length>0&&player.queue?.length===tracks.length&&tracks.every((item,index)=>player.queue[index]?.id===item.id)&&tracks.some(item=>item.id===player.currentTrack?.id);
 const playing=active&&player.isPlaying;
 const play=shuffle=>{if(!tracks.length)return;if(!shuffle&&active){player.togglePlay();return;}player.setShuffle(shuffle);player.playTrackAt(tracks,0);};
 return <section className="collection-spotlight">
  <div className="collection-spotlight-copy"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="collection-spotlight-description">{description}</p>
   <div className="collection-spotlight-actions"><button className="chrome-button" disabled={!tracks.length} onClick={()=>play(false)}>{playing?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}{playing?"Pause":active?"Resume":"Play"}</button><button className="playlist-action" disabled={!tracks.length} onClick={()=>play(true)}><Shuffle size={17}/>Shuffle</button></div>
  </div>
  {track&&<Link className="collection-spotlight-release" to={`/track/${track.id}`} aria-label={`View ${track.title} by ${track.artist}`}><div className="collection-spotlight-art">{cover?<img src={cover} alt="" loading="eager"/>:<Music2 size={48}/>}</div><p>{track.title}</p><span>{track.artist}</span></Link>}
 </section>;
}
