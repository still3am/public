import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {Music,Play,Pause,Loader2,MapPin} from "lucide-react";
import Avatar from "@/components/Avatar";
import ProfileMedia from "@/components/ProfileMedia";
import MotionGradient from "@/components/MotionGradient";
import {useCoverPalette} from "@/hooks/useCoverPalette";
import {base44} from "@/api/base44Client";
import {useAuth} from "@/lib/AuthContext";
import {useNotePreview} from "@/hooks/useNotePreview";
import {useCoverUrl} from "@/hooks/useCoverUrl";

function Song({track,preview,onPlay}){
 const cover=useCoverUrl(track.cover_art_url),playing=preview.trackId===track.id&&preview.playing;
 return <div className="discover-mini-song">
  <span className="discover-mini-cover">{cover?<img src={cover} alt="" loading="lazy"/>:<Music size={18}/>}</span>
  <Link to={"/track/"+encodeURIComponent(track.id)}><strong>{track.title||"Untitled"}</strong><small>{track.artist||track.uploader_name||"PUBLIC"}</small></Link>
  <button type="button" disabled={preview.loading} aria-label={(playing?"Pause preview of ":"Preview ")+(track.title||"song")} aria-pressed={playing} onClick={()=>onPlay(track)}>{preview.loading&&preview.trackId===track.id?<Loader2 size={17} className="animate-spin"/>:playing?<Pause size={16} fill="currentColor"/>:<Play size={16} fill="currentColor"/>}</button>
 </div>;
}

export default function DiscoverProfileCard({person,active,direction,children}){
 const {user}=useAuth();
 const preview=useNotePreview({active,accountId:user?.id,scope:person.id,resumeOnEnd:true});
 const [songs,setSongs]=useState([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0),[playError,setPlayError]=useState("");
 const name=person.display_name||person.full_name||person.username||"PUBLIC listener";
 const ids=[...new Set([person.featured_track_id,...(Array.isArray(person.top_track_ids)?person.top_track_ids:[])].filter(Boolean))].slice(0,3);
 const songKey=ids.join("|");
 useEffect(()=>{
  if(!active)return;
  let cancelled=false;setLoading(true);setFailed(false);setSongs([]);
  if(!ids.length){setLoading(false);return;}
  (async()=>{
   try{
    const page=await base44.entities.Track.filter({id:{$in:ids}},{limit:3});
    const rows=Array.isArray(page)?page:page?.items;if(!Array.isArray(rows))throw Error("Invalid tracks");
    const byId=new Map(rows.map(row=>[row.id,row]));
    if(!cancelled)setSongs(ids.map(id=>byId.get(id)).filter(Boolean));
   }catch{if(!cancelled)setFailed(true);}
   finally{if(!cancelled)setLoading(false);}
  })();
  return ()=>{cancelled=true;};
 // songKey is the stable signature of the selected public songs.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[songKey,active,retry]);
 async function play(track){
  setPlayError("");try{await preview.play(track);}catch{setPlayError("Couldn’t preview this song. Try again.");}
 }
 const hasBanner=!person.banner_use_default&&!!person.banner_url;
 const automatic=!(["custom","off"].includes(person.profile_background_mode));
 const featured=songs.find(song=>song.id===person.featured_track_id);
 const cover=useCoverUrl(automatic?featured?.cover_art_url:"");
 const {colors:coverColors}=useCoverPalette(cover);
 const palette=person.profile_background_mode==="off"?[]:automatic?coverColors.slice(0,3):(Array.isArray(person.profile_background_colors)?person.profile_background_colors:[]).filter(color=>/^#[0-9a-f]{6}$/i.test(color)).slice(0,3);
 const hasGradient=palette.length>0;
 const gradientStyle=hasGradient?{"--foreground":"0 0% 100%","--background":"240 6% 8%","--card":"240 6% 8%","--muted-foreground":"0 0% 88%","--border":"0 0% 100% / .22"}:undefined;
 return <article style={gradientStyle} className={"discover-mini-profile "+(hasGradient?"has-profile-gradient ":"")+(direction<0?"from-previous":"from-next")} aria-label={"Suggested profile: "+name}>
  {hasGradient&&<MotionGradient className="discover-profile-gradient" colors={palette} motion={person.profile_background_motion==="still"?"still":"flow"} speed={Math.max(.35,Math.min(1.6,Number(person.profile_background_speed)||1))} active={active} pauseWhenCovered/>}
  <div className={"discover-mini-banner "+(!hasBanner?"is-default":"")}>
   {hasBanner?<ProfileMedia src={person.banner_url} mobileSrc={person.banner_mobile_url} videoSrc={person.banner_video_url} gifSrc={person.banner_gif_url} active={active}/>:<Music size={48} strokeWidth={1} aria-hidden="true"/>}
  </div>
  <div className="discover-mini-body">
   <Link className="discover-mini-avatar" to={"/profile/"+encodeURIComponent(person.id)} aria-label={"Open "+name+" profile"}><Avatar user={person} size={76} motion active={active}/></Link>
   {person.shared>0&&<span className="discover-shared"><Music size={12}/>{person.reason}</span>}
   <h3><Link to={"/profile/"+encodeURIComponent(person.id)}>{name}</Link></h3>
   <p className="discover-mini-handle">{person.username?"@"+person.username:person.is_artist?"Artist on PUBLIC":"Listener on PUBLIC"}{person.pronouns&&<span> · {person.pronouns}</span>}</p>
   {person.location&&<p className="discover-mini-location"><MapPin size={12}/>{person.location}</p>}
   {person.bio&&<p className="discover-mini-bio">{person.bio}</p>}
   <div className="discover-mini-music">
    <h4>{person.top_tracks_label||"Their soundtrack"}</h4>
    {loading?<p className="discover-music-status" role="status"><Loader2 size={14} className="animate-spin"/> Loading music…</p>:failed?<p className="discover-music-status">Couldn’t load music. <button type="button" onClick={()=>setRetry(n=>n+1)}>Retry</button></p>:songs.length?songs.map(track=><Song key={track.id} track={track} preview={preview} onPlay={play}/>):<p className="discover-music-status"><Music size={15}/> Still finding their soundtrack.</p>}
    {preview.trackId&&<button type="button" className="discover-end-preview" onClick={preview.stop}>End preview · Return to your music</button>}
    {playError&&<p className="profile-discover-error" role="alert">{playError}</p>}
   </div>
   {children}
  </div>
 </article>;
}
