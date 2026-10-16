import {useCallback,useEffect,useRef,useState} from 'react';
import {base44} from '@/api/base44Client';
import {getUsersByIds} from '@/lib/userLookup';
import {coalesce} from '@/lib/coalesce';
export function useSharedTracks(uid){
 const [state,setState]=useState({uid:null,rows:[],loading:true,error:false}),version=useRef(0),account=useRef(uid);account.current=uid;
 const reload=useCallback(async()=>{
  if(!uid){setState({uid:null,rows:[],loading:false,error:false});return;}
  const request=++version.current;
  setState(old=>({uid,rows:old.uid===uid?old.rows:[],loading:true,error:false}));
  try{
   const page=await base44.entities.Notification.filter({user_id:uid,type:'track_shared'},{sort:'-created_date',limit:50});
   const items=Array.isArray(page)?page:page?.items;if(!Array.isArray(items))throw Error('Invalid shared music');
   const actors=await getUsersByIds([...new Set(items.map(n=>n.actor_id||n.sender_id).filter(Boolean))]).catch(()=>[]);
   if(request!==version.current||account.current!==uid)return;
   const actorMap=new Map(actors.map(actor=>[actor.id,actor]));
   setState(old=>{const previous=new Map((old.uid===uid?old.rows:[]).map(n=>[n.id,n]));return {uid,loading:false,error:false,rows:items.filter(n=>n.user_id===uid&&n.type==='track_shared').map(n=>({...n,actor_id:n.actor_id||n.sender_id,actor:actorMap.get(n.actor_id||n.sender_id)||previous.get(n.id)?.actor||{display_name:n.actor_name||'PUBLIC member',avatar_url:n.actor_avatar_url||''}}))};});
  }catch{if(request===version.current&&account.current===uid)setState(old=>({uid,rows:old.uid===uid?old.rows:[],loading:false,error:true}));}
 },[uid]);
 useEffect(()=>{
  version.current++;reload();if(!uid)return;
  const update=coalesce(()=>{if(!document.hidden)reload();},1200);let unsubscribe=()=>{};try{unsubscribe=base44.entities.Notification.subscribe(update);}catch{}
  window.addEventListener('notifications:changed',update);window.addEventListener('focus',update);const timer=setInterval(update,30000);
  return()=>{version.current++;update.cancel();unsubscribe();clearInterval(timer);window.removeEventListener('notifications:changed',update);window.removeEventListener('focus',update);};
 },[uid,reload]);
 return state.uid===uid?{...state,reload}:{rows:[],loading:!!uid,error:false,reload};
}
