import {useEffect} from 'react';
import {useAuth} from '@/lib/AuthContext';
import {canUploadMusic} from '@/lib/creatorAccess';
import {musicRequestAction} from '@/lib/musicRequests';
import {base44} from '@/api/base44Client';
import {coalesce} from '@/lib/coalesce';
export default function MusicRequestSync(){
 const {user}=useAuth(),allowed=canUploadMusic(user);
 useEffect(()=>{
  if(!allowed)return;let stopped=false,running=false,again=false;
  const refresh=coalesce(async()=>{if(stopped||!navigator.onLine)return;if(running){again=true;return;}running=true;try{const result=await musicRequestAction('reconcile');if(!stopped&&result.matched>0)window.dispatchEvent(new Event('music-requests:changed'));}catch{/* Music Requests shows retryable errors; publishing remains independent. */}finally{running=false;if(again&&!stopped){again=false;refresh();}}},5000);
  refresh();window.addEventListener('catalog:invalidate',refresh);window.addEventListener('online',refresh);
  let unsubscribe=()=>{};try{unsubscribe=base44.entities.Track.subscribe(event=>{if(event?.data?.is_published===true)refresh();});}catch{}
  return()=>{stopped=true;refresh.cancel();unsubscribe();window.removeEventListener('catalog:invalidate',refresh);window.removeEventListener('online',refresh);};
 },[user?.id,user?.role,user?.creator_role,allowed]);return null;
}
