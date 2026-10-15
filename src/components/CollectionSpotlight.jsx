import { Play, Shuffle, Music2 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useCoverUrl } from "@/hooks/useCoverUrl";
export default function CollectionSpotlight({title,description,tracks,eyebrow}) {
 const player=usePlayer(),track=tracks[0],cover=useCoverUrl(track?.cover_art_url);
 const play=shuffle=>{if(!tracks.length)return;player.setShuffle(shuffle);player.playTrackAt(tracks,0);};
 return <section className="collection-spotlight">
  <div className="collection-spotlight-copy"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="collection-spotlight-description">{description}</p>
   <div className="collection-spotlight-actions"><button className="chrome-button" disabled={!tracks.length} onClick={()=>play(false)}><Play size={17} fill="currentColor"/>Play</button><button className="playlist-action" disabled={!tracks.length} onClick={()=>play(true)}><Shuffle size={17}/>Shuffle</button></div>
  </div>
  {track&&<div className="collection-spotlight-release"><div className="collection-spotlight-art">{cover?<img src={cover} alt="" loading="eager"/>:<Music2 size={48}/>}</div><p>{track.title}</p><span>{track.artist}</span></div>}
 </section>;
}
