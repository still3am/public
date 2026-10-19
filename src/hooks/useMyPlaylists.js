import {readAllPages} from '@/lib/readPages';
import {useCallback,useEffect,useRef,useState} from 'react';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
const cache=new Map(),TTL=30000;
window.addEventListener('playlists:changed',()=>{cache.forEach(entry=>{entry.expires=0;entry.version++;entry.inflight=null;});});
window.addEventListener('account:cleared',()=>cache.clear());
async function readMine(uid,fresh=false){
 let entry=cache.get(uid);
 if(!entry){entry={rows:null,expires:0,inflight:null,version:0};cache.set(uid,entry);}
 if(fresh)entry.expires=0;
 if(entry.rows&&Date.now()<entry.expires)return entry.rows;
 if(entry.inflight)return entry.inflight;
 const version=entry.version;
 let request;
 request=readAllPages(options=>base44.entities.Playlist.filter({$or:[{creator_id:uid},{collaborator_ids:uid}]},{sort:'-created_date',...options})).then(rows=>{
  if(cache.get(uid)!==entry)throw Error('Account changed');
  if(version!==entry.version)return readMine(uid);
  entry.rows=rows;entry.expires=Date.now()+TTL;return rows;
 }).finally(()=>{if(entry.inflight===request)entry.inflight=null;});
 entry.inflight=request;return request;
}
export function useMyPlaylists(){
 const {user}=useAuth(),uid=user?.id;
 const [playlists,setPlaylists]=useState(()=>cache.get(uid)?.rows||null),[error,setError]=useState(false),[loading,setLoading]=useState(false);
 const owner=useRef(uid),version=useRef(0),account=useRef(uid);account.current=uid;
 const reload=useCallback(async(fresh=true)=>{
  const request=++version.current;setError(false);
  if(!uid){setPlaylists([]);setLoading(false);return;}
  setLoading(true);
  try{const rows=await readMine(uid,fresh);if(request===version.current&&account.current===uid)setPlaylists(rows);}
  catch{if(request===version.current&&account.current===uid)setError(true);}
  finally{if(request===version.current)setLoading(false);}
 },[uid]);
 useEffect(()=>{
  owner.current=uid;setPlaylists(cache.get(uid)?.rows||null);reload(false);
  const refresh=()=>reload(true);window.addEventListener('playlists:changed',refresh);
  return()=>{version.current++;window.removeEventListener('playlists:changed',refresh);};
 },[uid,reload]);
 return {playlists:owner.current===uid?playlists:cache.get(uid)?.rows||null,error,loading,reload};
}
