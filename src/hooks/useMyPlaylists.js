import {coalesce} from '@/lib/coalesce';
import {getPlaylist} from "@/lib/collaborativePlaylists";
import {loadMyPlaylistList} from '@/lib/myPlaylistList';
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
 if(entry.rows&&Date.now()<entry.expires)return {rows:entry.rows,partial:entry.partial};
 if(entry.inflight)return entry.inflight;
 const version=entry.version;
 let request;
 request=loadMyPlaylistList(base44,uid,getPlaylist).then(async({rows,partial})=>{
  if(cache.get(uid)!==entry)throw Error('Account changed');
  if(version!==entry.version)return readMine(uid);
  entry.rows=rows;entry.partial=partial;entry.expires=Date.now()+TTL;return {rows,partial};
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
  try{const {rows,partial}=await readMine(uid,fresh);if(request===version.current&&account.current===uid){setPlaylists(rows);setError(!!partial);}}
  catch{if(request===version.current&&account.current===uid)setError(true);}
  finally{if(request===version.current)setLoading(false);}
 },[uid]);
 useEffect(()=>{
  owner.current=uid;setPlaylists(cache.get(uid)?.rows||null);reload(false);
  const refresh=coalesce(()=>reload(true),600);window.addEventListener('playlists:changed',refresh);window.addEventListener('focus',refresh);
  let stop=()=>{};try{if(uid)stop=base44.entities.PlaylistCollaboration.subscribe(refresh);}catch{}
  let stopPlaylists=()=>{};try{if(uid)stopPlaylists=base44.entities.Playlist.subscribe(refresh);}catch{}
  return()=>{version.current++;refresh.cancel();stop();stopPlaylists();window.removeEventListener('playlists:changed',refresh);window.removeEventListener('focus',refresh);};
 },[uid,reload]);
 return {playlists:owner.current===uid?playlists:cache.get(uid)?.rows||null,error,loading,reload};
}
