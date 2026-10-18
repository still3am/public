import ScrollShelf from "@/components/ScrollShelf";
import {useEffect,useState} from "react";
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
 const [state,setState]=useState({userId:"",rows:[]});
 useEffect(()=>{
  if(!userId||!active)return;
  let alive=true;
  base44.entities.Playlist.filter({creator_id:userId,is_public:true},"-updated_date",12).then(page=>{if(alive)setState({userId,rows:Array.isArray(page)?page:page?.items||[]});}).catch(()=>{if(alive)setState({userId,rows:[]});});
  return()=>{alive=false;};
 },[userId,active]);
 const rows=state.userId===userId?state.rows:[];
 if(!rows.length)return null;
 return <section className="profile-public-playlists"><h2>Public playlists</h2><ScrollShelf className="profile-playlist-shelf" label="Public playlists">{rows.map(playlist=><PlaylistTile key={playlist.id} playlist={playlist}/>)}</ScrollShelf></section>;
}
