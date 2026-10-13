import {useEffect,useState} from 'react';
import {base44} from '@/api/base44Client';
import {readAllPages} from '@/lib/readPages';
import {peekPublishedTracks} from '@/lib/catalogCache';
const covers=new Map(),inflight=new Map();let generation=0;
const clear=()=>{generation++;covers.clear();inflight.clear();};
window.addEventListener('catalog:invalidate',clear);window.addEventListener('account:cleared',clear);
async function resolve(ids){
 const published=new Map(peekPublishedTracks().map(track=>[track.id,track]));
 for(const id of ids){const known=published.get(id);if(!known)break;if(known.cover_art_url)return known.cover_art_url;}
 for(let start=0;start<ids.length;start+=200){
  const group=ids.slice(start,start+200),rows=await readAllPages(options=>base44.entities.Track.filter({id:{$in:group}},{fields:['id','cover_art_url'],...options}));
  const byId=new Map(rows.map(track=>[track.id,track]));
  for(const id of group){const cover=byId.get(id)?.cover_art_url;if(cover)return cover;}
 }
 return '';
}
function load(key,ids){
 if(covers.has(key))return Promise.resolve(covers.get(key));
 if(inflight.has(key))return inflight.get(key);
 const started=generation;let request;
 request=resolve(ids).then(cover=>{if(started===generation)covers.set(key,cover);return cover;}).finally(()=>{if(inflight.get(key)===request)inflight.delete(key);});
 inflight.set(key,request);return request;
}
export function usePlaylistCover(playlist){
 const own=playlist?.cover_art_url||'',ids=[...new Set(playlist?.track_ids||[])],key=(playlist?.id||'')+':'+ids.join(',');
 const [borrowed,setBorrowed]=useState({key:'',cover:''}),[revision,setRevision]=useState(0);
 useEffect(()=>{const update=()=>{setBorrowed({key:'',cover:''});setRevision(value=>value+1);};window.addEventListener('catalog:invalidate',update);window.addEventListener('account:cleared',update);return()=>{window.removeEventListener('catalog:invalidate',update);window.removeEventListener('account:cleared',update);};},[]);
 useEffect(()=>{if(own||!playlist?.id||!ids.length)return;let alive=true;load(key,ids).then(cover=>{if(alive)setBorrowed({key,cover});}).catch(()=>{});return()=>{alive=false;};},[key,own,revision]);
 return own|| (borrowed.key===key?borrowed.cover:covers.get(key)||'');
}
