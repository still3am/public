import {entityRows} from "@/lib/entityRows";
import ScrollShelf from "@/components/ScrollShelf";
import {useEffect,useState,useRef} from "react";
import {Link} from "react-router-dom";
import {ListMusic} from "lucide-react";
import {base44} from "@/api/base44Client";
import {useCoverUrl} from "@/hooks/useCoverUrl";
import {usePlaylistCover} from "@/hooks/usePlaylistCover";
import "./profile-playlists.css";
function PlaylistTile({playlist}){
 const source=usePlaylistCover(playlist);
 const cover=useCoverUrl(source),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[cover]);
 const name=playlist.name||"Untitled playlist";
 const count=new Set((Array.isArray(playlist.track_ids)?playlist.track_ids:[]).filter(Boolean)).size;
 const hue=[...name].reduce((value,char)=>(value*31+char.charCodeAt(0))%360,0);
 return <Link to={"/playlist/"+encodeURIComponent(playlist.id)} className="profile-playlist-tile" aria-label={"Open "+name}>
  <div className="profile-playlist-art" style={!cover||failed?{backgroundImage:"linear-gradient(145deg,hsl("+hue+" 22% 38%),hsl("+((hue+45)%360)+" 18% 15%))"}:undefined}>{cover&&!failed?<img src={cover} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<span className="profile-playlist-fallback"><ListMusic size={44} aria-hidden="true"/><span>PUBLIC</span></span>}</div>
  <div className="profile-playlist-caption"><h3>{name}</h3><p>{count} {count===1?"song":"songs"}</p></div>
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
 return <section className="profile-public-playlists" aria-label="Public playlists"><header className="profile-playlists-heading"><h2>Playlists</h2></header>
 {rows.length>0&&<ScrollShelf paged className="profile-playlist-shelf" label="Playlists">{rows.map(playlist=><PlaylistTile key={playlist.id} playlist={playlist}/>)}</ScrollShelf>}
 {state.error&&<div className="profile-playlist-status" role="status"><span>Playlists couldn’t refresh. Previously loaded playlists are still here.</span><button type="button" onClick={()=>load()}>Retry</button></div>}
 {state.loading&&!rows.length&&<div className="profile-playlist-loading" role="status" aria-label="Loading playlists">{[0,1,2].map(index=><div key={index} aria-hidden="true"><i/><span/><small/></div>)}</div>}
 {state.more&&!state.error&&<button type="button" disabled={state.loading} className="profile-playlists-more" onClick={()=>load(true)}>Show more playlists</button>}
 </section>;
}
