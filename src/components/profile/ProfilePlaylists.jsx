import {entityRows} from "@/lib/entityRows";
import ScrollShelf from "@/components/ScrollShelf";
import {useEffect,useState,useRef} from "react";
import {Link} from "react-router-dom";
import {ListMusic} from "lucide-react";
import {base44} from "@/api/base44Client";
import {useCoverUrl} from "@/hooks/useCoverUrl";
import {usePlaylistCover} from "@/hooks/usePlaylistCover";
function PlaylistTile({playlist}){
 const source=usePlaylistCover(playlist);
 const cover=useCoverUrl(source),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[cover]);
 return <Link to={"/playlist/"+playlist.id} className="profile-playlist-tile">
  <div className="profile-playlist-art">{cover&&!failed?<img src={cover} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<ListMusic size={30}/>}</div>
  <h3>{playlist.name}</h3><p>{playlist.track_ids?.length||0} songs</p>
 </Link>;
}

export default function ProfilePlaylists({userId,active}){
 const [state,setState]=useState({userId:'',rows:[],loading:false,error:false,more:false}),version=useRef(0),latest=useRef(null),lock=useRef(false),owner=useRef(userId);owner.current=userId;latest.current=state;
 async function load(more=false){
  if(!userId||!active||lock.current)return;
  const current=++version.current,uid=userId,old=latest.current;
  const same=old.userId===uid,offset=more&&same?old.rows.length:0,limit=more?12:Math.max(12,same?old.rows.length:0);
  lock.current=true;setState(s=>({...s,loading:true,error:false}));
  try{
   const page=await base44.entities.Playlist.filter({creator_id:uid,is_public:true},'-updated_date',limit+1,offset);
   const rows=Array.isArray(page)?page:entityRows(page)||[];
   if(current!==version.current||owner.current!==uid)return;
   setState({userId:uid,rows:[...new Map([...(more&&same?old.rows:[]),...rows.slice(0,limit)].map(r=>[r.id,r])).values()],loading:false,error:false,more:rows.length>limit});
  }catch{if(current===version.current&&owner.current===uid)setState(s=>({...s,userId:uid,rows:s.userId===uid?s.rows:[],loading:false,error:true}));}
  finally{if(current===version.current)lock.current=false;}
 }
 useEffect(()=>{
  if(!active||!userId)return;
  lock.current=false;load();
  return()=>{version.current++;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[userId,active]);
 const rows=state.userId===userId?state.rows:[];
 if(!rows.length&&!state.loading&&!state.error)return null;
 return <section className="profile-public-playlists"><h2>Public playlists</h2>
 {rows.length>0&&<ScrollShelf className="profile-playlist-shelf" label="Public playlists">{rows.map(playlist=><PlaylistTile key={playlist.id} playlist={playlist}/>)}</ScrollShelf>}
 {state.error&&<div className="profile-playlist-status" role="status"><span>Playlists couldn’t refresh. Previously loaded playlists are still here.</span><button type="button" onClick={()=>load()}>Retry</button></div>}
 {state.loading&&<p role="status" className="text-xs text-muted-foreground py-3">Loading playlists…</p>}
 {state.more&&!state.error&&<button type="button" disabled={state.loading} className="profile-playlists-more" onClick={()=>load(true)}>Show more playlists</button>}
 </section>;
}
