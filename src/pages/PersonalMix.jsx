import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate,useParams} from 'react-router-dom';
import {Loader2} from 'lucide-react';
import {useAuth} from '@/lib/AuthContext';
import {useSafety} from '@/context/SafetyContext';
import {getPublishedTracks} from '@/lib/catalogCache';
import {getUserGenres} from '@/lib/userGenres';
import {getRecentPlays} from '@/lib/recentPlays';
import {readLibraryRows} from '@/lib/libraryRows';
import {base44} from '@/api/base44Client';
import {buildPersonalMixes} from '@/lib/personalMixes';
import {PersonalMixContent} from '@/components/home/MadeForYou';
export default function PersonalMix(){
 const {id}=useParams(),{user}=useAuth(),{blocked}=useSafety(),location=useLocation(),nav=useNavigate();
 const [data,setData]=useState({owner:null,id:null,mix:null,error:false,loading:true,warning:false}),version=useRef(0);
 const snapshot=useRef(location.state);
 async function load(fresh=false){
  const request=++version.current,uid=user?.id;if(!uid)return;
  setData(old=>({...old,loading:true,error:false}));
  try{
   const [catalog,preferences,library]=await Promise.all([getPublishedTracks(fresh),getUserGenres(uid).then(value=>({value,error:false})).catch(()=>({value:[],error:true})),readLibraryRows(base44.entities.LibraryItem,{user_id:uid}).then(value=>({value,error:false})).catch(()=>({value:[],error:true}))]);
   if(request!==version.current)return;
   const mixes=buildPersonalMixes(catalog,{uid,recent:getRecentPlays(),genres:preferences.value,savedIds:new Set(library.value.map(row=>row.track_id))});
   let mix=mixes.find(item=>item.id===id)||null;
   const passed=snapshot.current;
   if(mix&&passed?.owner===uid&&passed.mixId===id&&Array.isArray(passed.trackIds)){
    const map=new Map(catalog.map(t=>[t.id,t])),seen=new Set();
    const tracks=passed.trackIds.slice(0,24).filter(trackId=>typeof trackId==='string'&&!seen.has(trackId)&&seen.add(trackId)).map(trackId=>map.get(trackId)).filter(t=>t?.is_published&&(t.audio_url||t._private_audio));
    if(tracks.length)mix={...mix,tracks};
   }
   setData({owner:uid,id,mix,error:false,loading:false,warning:preferences.error||library.error});
  }catch{if(request===version.current)setData(old=>({...old,owner:uid,id,error:true,loading:false}));}
 }
 useEffect(()=>{snapshot.current=location.state;setData({owner:null,id:null,mix:null,error:false,loading:true,warning:false});load();return()=>{version.current++;};},[id,user?.id]);
 useEffect(()=>{const changed=()=>load();window.addEventListener('catalog:invalidate',changed);return()=>window.removeEventListener('catalog:invalidate',changed);},[id,user?.id]);
 const back=()=>window.history.state?.idx>0?nav(-1):nav('/');
 if(data.owner!==user?.id||data.id!==id||data.loading)return <div className="py-20 grid place-items-center" role="status" aria-label="Loading your mix"><Loader2 className="animate-spin"/></div>;
 if(data.error)return <div className="py-16 text-center"><p>This mix could not load.</p><button className="playlist-action mt-4" onClick={()=>load(true)}>Retry</button><Link className="block mt-4 text-sm underline" to="/">Back to Home</Link></div>;
 if(!data.mix)return <div className="py-16 text-center"><h1 className="text-2xl font-bold">This mix is not ready yet</h1><p className="text-sm text-muted-foreground mt-3">Save or play more music to build this selection.</p>{data.warning&&<button className="playlist-action mt-4" onClick={()=>load(true)}>Retry your preferences</button>}<Link className="block mt-5 text-sm underline" to="/">Back to Home</Link></div>;
 const mix={...data.mix,tracks:data.mix.tracks.filter(t=>!blocked.has(t.uploader_id))};
 return <>{data.warning&&<p className="personal-mix-note" role="alert">Some music preferences could not refresh. <button onClick={()=>load(true)}>Retry</button></p>}<PersonalMixContent key={user.id+id} mix={mix} uid={user.id} onBack={back}/></>;
}
