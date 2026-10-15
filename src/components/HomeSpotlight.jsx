import {Link,useLocation} from "react-router-dom";
import {Play,Pause,ArrowUpRight,Music} from "lucide-react";
import MotionGradient from "@/components/MotionGradient";
import ArtistLinks from "@/components/ArtistLinks";
import {Image} from "@/components/ui/image";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";
import {useLongPressMenu} from "@/hooks/useLongPressMenu";
import {useColorPalette} from "@/hooks/useColorPalette";
import {useCoverUrl} from "@/hooks/useCoverUrl";
import "./home-spotlight.css";

export default function HomeSpotlight({track,playing,onPlay,discoveryQueue,onDiscover}){
 const menu=useLongPressMenu(false,{allowButtons:true}),location=useLocation();
 const cover=useCoverUrl(track.cover_art_url),colors=useColorPalette(cover,true);
 return <section className="home-editorial" aria-label="Featured music">
  <MotionGradient colors={colors} speed={.5} active={location.pathname==="/"} pauseWhenCovered className="absolute inset-0"/>
  <div className="home-editorial-shade" aria-hidden="true"/>
  <div className="home-editorial-copy"><p className="home-editorial-kicker">THE LATEST ON PUBLIC</p><h2><Link to={`/track/${track.id}`}>{track.title}</Link></h2><div className="home-editorial-artist"><ArtistLinks artist={track.artist||track.uploader_name} maxShown={3} linkClassName="hover:underline"/></div><p className="home-editorial-caption">A new addition. Your next repeat.</p>
   <div className="home-editorial-actions"><button type="button" className="home-editorial-play" onClick={onPlay}>{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}{playing?"Pause":"Play now"}</button><button type="button" disabled={!discoveryQueue.length} onClick={onDiscover}>Discover<ArrowUpRight size={17}/></button></div>
  </div>
  <div ref={menu.ref} {...menu.handlers} onClickCapture={event=>{if(menu.consumeLongPress()){event.preventDefault();event.stopPropagation();}}} className="home-editorial-art song-menu-surface group">
   <Link to={`/track/${track.id}`} aria-label={`View ${track.title}`}>{cover?<Image src={cover} fittingType="fill" alt={`${track.title} cover`} className="w-full h-full"/>:<Music size={56}/>}</Link>
   <div className="home-editorial-menu song-menu-reveal"><TrackOptionsMenu track={track} openSignal={menu.signal} anchorRef={menu.ref}/></div>
  </div>
 </section>;
}
