import {useEffect,useRef,useState} from 'react';
import {Star} from 'lucide-react';
import {useAuth} from '@/lib/AuthContext';
import {base44} from '@/api/base44Client';
import {readLikeState,setLikeState} from '@/lib/likeActions';
import {withReadTimeout} from '@/lib/readTimeout';
import './track-favorite.css';

export default function TrackFavoriteButton({trackId,className=''}){
 const {user}=useAuth(),uid=user?.id,key=(uid||'guest')+':'+trackId;
 const [state,setState]=useState({key:'',liked:false,ready:false,loading:false,busy:false,error:''}),[retry,setRetry]=useState(0);
 const identity=useRef(key),alive=useRef(true),lock=useRef('');identity.current=key;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  let live=true,version=0;
  const load=async()=>{
   const request=++version;
   setState({key,liked:false,ready:!uid,loading:!!uid,busy:false,error:''});
   if(!uid||!trackId)return;
   try{const liked=await withReadTimeout(readLikeState(base44,uid,trackId));if(live&&request===version)setState({key,liked,ready:true,loading:false,busy:false,error:''});}
   catch{if(live&&request===version)setState({key,liked:false,ready:false,loading:false,busy:false,error:'Favorites couldn’t load. Tap the star to retry.'});}
  };
  const changed=event=>{if(event.detail?.uid!==uid||event.detail?.trackId!==trackId||typeof event.detail?.liked!=='boolean')return;version++;if(live)setState({key,liked:event.detail.liked,ready:true,loading:false,busy:false,error:''});};
  load();window.addEventListener('likes:changed',changed);window.addEventListener('online',load);
  return()=>{live=false;version++;window.removeEventListener('likes:changed',changed);window.removeEventListener('online',load);};
 },[key,uid,trackId,retry]);
 const current=state.key===key?state:{liked:false,ready:false,loading:!!uid,busy:false,error:''};
 async function toggle(){
  if(!uid){base44.auth.redirectToLogin(window.location.href);return;}
  if(current.loading||lock.current===key)return;
  if(!current.ready){setRetry(v=>v+1);return;}
  lock.current=key;const started=key;
  setState(old=>({...old,busy:true,error:''}));
  try{const result=await setLikeState(base44,uid,trackId,!current.liked);if(alive.current&&identity.current===started)setState({key:started,liked:result.liked,ready:true,loading:false,busy:false,error:''});}
  catch{if(alive.current&&identity.current===started)setState(old=>({...old,busy:false,error:'Couldn’t save your favorite. Please try again.'}));}
  finally{if(lock.current===started)lock.current='';}
 }
 const label=current.error&&!current.ready?'Retry favorite status':current.liked?'Remove from favorites':'Add to favorites';
 return <span className={'track-favorite '+className}>
  <button type="button" className="track-favorite-button" disabled={!trackId||current.loading||current.busy} aria-label={label} title={label} aria-pressed={current.ready?current.liked:false} aria-busy={current.loading||current.busy} onClick={toggle}><Star size={22} strokeWidth={2} fill={current.liked?'currentColor':'none'}/></button>
  {current.error&&<span className="track-favorite-error" role="status">{current.error}</span>}
 </span>;
}
