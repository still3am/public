import {useEffect} from "react";
import {Link} from "react-router-dom";
import {Radio as RadioIcon,Play,Pause,Loader2,ArrowUpRight,Music2} from "lucide-react";
import {useRadio} from "@/context/RadioContext";
import {useLibrary} from "@/context/LibraryContext";
import LibraryButton from "@/components/LibraryButton";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";
import {useCoverUrl} from "@/hooks/useCoverUrl";

function RadioTrack({entry,label}){
 const track=entry.track,cover=useCoverUrl(track?.cover_art_url);
 if(!track)return null;
 return <div className="radio-track"><Link to={"/track/"+track.id} className="radio-track-art">{cover?<img src={cover} alt="" loading="lazy"/>:<Music2 size={22}/>}</Link><div className="min-w-0 flex-1"><p className="eyebrow">{label}</p><Link to={"/track/"+track.id} className="block font-semibold truncate mt-1">{track.title}</Link><p className="text-xs text-muted-foreground truncate mt-1">{track.artist||track.uploader_name}</p></div><TrackOptionsMenu track={track}/></div>;
}
export default function Radio(){
 const radio=useRadio(),{isInLibrary,toggle}=useLibrary();
 useEffect(()=>{radio.refresh();},[]);
 const track=radio.current?.track,cover=useCoverUrl(track?.cover_art_url);
 const upcoming=radio.schedule?.slots?.filter(slot=>slot.start_ms>radio.clock&&slot.track).slice(0,5)||[];
 return <div className="radio-page">
  <header className="page-intro"><p className="eyebrow">One station. One shared moment.</p><h1>PUBLIC. Radio</h1><p>A continuous broadcast from the PUBLIC community.</p></header>
  <section className="radio-hero">
   <div className="radio-station-art">{cover?<img src={cover} alt="On air cover"/>:<div className="radio-station-mark"><RadioIcon size={56}/><strong>PUBLIC.<br/>RADIO</strong></div>}<span className="radio-air-label"><span/>On air</span></div>
   <div className="radio-hero-copy"><p className="eyebrow">The daily rotation</p><h2>{track?.title||"Your next discovery is on air."}</h2><p>{track?.artist||track?.uploader_name||"Fresh sounds, familiar favorites, and artists worth knowing."}</p>
    <div className="radio-hero-actions"><button className="chrome-button" disabled={radio.loading} onClick={radio.joined?radio.pause:radio.join}>{radio.loading?<Loader2 size={17} className="animate-spin"/>:radio.joined?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}{radio.joined?"Pause radio":"Join live"}</button>{track&&<LibraryButton saved={isInLibrary(track.id)} onClick={()=>toggle(track)}/>}</div>
    <p className="radio-caption">{radio.joined?"You're listening live.":"Join the song already playing. Pause whenever you need."}</p>
    {radio.notice&&<p role="status" className="text-xs text-muted-foreground mt-3">{radio.notice}</p>}
    {!radio.loading&&radio.schedule&&!radio.schedule.slots.length&&<p className="text-sm text-muted-foreground mt-3">The station is waiting for approved tracks with complete audio durations.</p>}
   </div>
  </section>
  <div className="radio-columns"><section><div className="section-heading"><h2>Coming up</h2><span className="eyebrow">Today's lineup</span></div>{upcoming.map((entry,index)=><RadioTrack key={entry.start_ms} entry={entry} label={index===0?"Up next":"In the rotation"}/>)}</section><section><div className="section-heading"><h2>Recently on air</h2><Link to="/search" className="text-xs text-muted-foreground inline-flex items-center gap-1">Explore music<ArrowUpRight size={13}/></Link></div>{radio.schedule?.recent?.filter(entry=>entry.track).map(entry=><RadioTrack key={entry.start_ms} entry={entry} label="Played on PUBLIC."/>)}</section></div>
 </div>;
}
