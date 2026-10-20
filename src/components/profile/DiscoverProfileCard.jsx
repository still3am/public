import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {Music,Play,Pause,Loader2,MapPin} from "lucide-react";
import Avatar from "@/components/Avatar";
import ProfileMedia from "@/components/ProfileMedia";
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
 return <article className={"discover-mini-profile "+(direction<0?"from-previous":"from-next")} aria-label={"Suggested profile: "+name}>
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
