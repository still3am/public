import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {ListMusic} from "lucide-react";
import {base44} from "@/api/base44Client";
import {useCoverUrl} from "@/hooks/useCoverUrl";
function PlaylistTile({playlist}){
 const cover=useCoverUrl(playlist.cover_art_url),[failed,setFailed]=useState(false);
 return <Link to={"/playlist/"+playlist.id} className="profile-playlist-tile">
  <div className="profile-playlist-art">{cover&&!failed?<img src={cover} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<ListMusic size={30}/>}</div>
  <h3>{playlist.name}</h3><p>{playlist.track_ids?.length||0} songs</p>
 </Link>;
}
export default function ProfilePlaylists({userId,active}){
 const [state,setState]=useState({userId:"",rows:[]});
 useEffect(()=>{
  if(!userId||!active)return;
  let alive=true;
  base44.entities.Playlist.filter({creator_id:userId,is_public:true},"-updated_date",12).then(page=>{if(alive)setState({userId,rows:Array.isArray(page)?page:page?.items||[]});}).catch(()=>{if(alive)setState({userId,rows:[]});});
  return()=>{alive=false;};
 },[userId,active]);
 const rows=state.userId===userId?state.rows:[];
 if(!rows.length)return null;
 return <section className="profile-public-playlists"><h2>Public playlists</h2><div className="profile-playlist-shelf" role="region" tabIndex={0} aria-label="Public playlists">{rows.map(playlist=><PlaylistTile key={playlist.id} playlist={playlist}/>)}</div></section>;
}
