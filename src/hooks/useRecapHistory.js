import {useEffect,useState} from 'react';
import {base44} from '@/api/base44Client';
import {readAllPages} from '@/lib/readPages';
import {pendingListening,syncListeningHistory} from '@/lib/listeningHistory';
export function useRecapHistory(uid) {
 const [state,setState]=useState({owner:null,sessions:[],events:[],loading:true,error:false}),[revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!uid)return;
  let alive=true;
  setState({owner:uid,sessions:[],events:[],loading:true,error:false});
  (async()=>{try{
   // Sync is an outbox write; it must not block read-only recap rendering.
   void syncListeningHistory(uid);
   const [sessions,events]=await Promise.all([
    readAllPages(opts=>base44.entities.ListeningSession.filter({created_by_id:uid},{sort:'-started_at',...opts})),
    readAllPages(opts=>base44.entities.PlayEvent.filter({user_id:uid},{sort:'-created_date',...opts}))
   ]);
   if(alive)setState({owner:uid,sessions:[...pendingListening(uid),...sessions],events,loading:false,error:false});
  }catch{if(alive)setState({owner:uid,sessions:[],events:[],loading:false,error:true});}})();
  return()=>{alive=false;};
 },[uid,revision]);
 useEffect(()=>{
  const refresh=()=>setRevision(n=>n+1);
  window.addEventListener('recentplays:change',refresh);
  window.addEventListener('online',refresh);
  return()=>{window.removeEventListener('recentplays:change',refresh);window.removeEventListener('online',refresh);};
 },[]);
 return {...(state.owner===uid?state:{sessions:[],events:[],loading:true,error:false}),retry:()=>setRevision(n=>n+1)};
}
