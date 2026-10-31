import {getMusicBrainz} from './songInfo';
import {findArtistInfo} from './artistInfo';
const cache=new Map(),pending=new Map();
const valid=value=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value||'');
const norm=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const quote=value=>'"'+String(value).replace(/[\\"]/g,' ').slice(0,100)+'"';
async function cached(key,load){
 const hit=cache.get(key);if(hit&&hit.until>Date.now())return hit.value;
 if(pending.has(key))return pending.get(key);
 const task=load().then(value=>{cache.set(key,{value,until:Date.now()+900000});if(cache.size>80)cache.delete(cache.keys().next().value);return value;}).finally(()=>pending.delete(key));pending.set(key,task);return task;
}
export function relatedArtistChoices(artist,rows,genres=[]){
 const seen=new Set([norm(artist.name)]),wanted=new Set(genres.map(norm));
 return (rows||[]).filter(row=>{const name=norm(row.name);if(!valid(row.id)||!name||seen.has(name)||row.disambiguation?.toLowerCase().includes('tribute'))return false;seen.add(name);return true;}).map(row=>({id:row.id,name:row.name,detail:row.disambiguation||row.area?.name||row.type||'',shared:(row.tags||[]).filter(tag=>wanted.has(norm(tag.name))).length})).sort((a,b)=>b.shared-a.shared||a.name.localeCompare(b.name)).slice(0,8);
}
export function upcomingEventChoices(events,today=new Date().toISOString().slice(0,10)){
 const seen=new Set();return (events||[]).filter(event=>{const date=event['life-span']?.begin;if(!valid(event.id)||seen.has(event.id)||event.cancelled===true||!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||date<today||!['Concert','Festival'].includes(event.type))return false;seen.add(event.id);return true;}).map(event=>({id:event.id,name:event.name||'Live performance',date:event['life-span'].begin,place:(event.relations||[]).find(r=>r.place?.name)?.place.name||(event['place-rels']||[])[0]?.place?.name||'',url:'https://musicbrainz.org/event/'+event.id})).sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name)).slice(0,8);
}
export async function findRelatedArtists(artist){
 return cached('related:'+JSON.stringify([artist.name,artist.musicbrainz_id,artist.catalogGenres]),async()=>{
  const info=await findArtistInfo(artist);const genres=(info?.genres||artist.catalogGenres||'').split(/\s*·\s*/).filter(Boolean).slice(0,2);
  if(!genres.length)return [];
  const query='('+genres.map(genre=>'tag:'+quote(genre)).join(' OR ')+')'+(valid(info?.id)?' AND NOT arid:'+info.id:'');
  const data=await getMusicBrainz('artist/?'+new URLSearchParams({query,fmt:'json',limit:'20'}));
  return relatedArtistChoices(artist,data.artists,genres);
 });
}
export async function findArtistShows(artist){
 const today=new Date().toISOString().slice(0,10);
 return cached('shows:'+JSON.stringify([artist.name,artist.musicbrainz_id,today]),async()=>{
  const id=valid(artist.musicbrainz_id)?artist.musicbrainz_id:(await findArtistInfo(artist))?.id;
  if(!valid(id))return [];
  const query='arid:'+id+' AND begin:['+today+' TO *] AND (type:concert OR type:festival)';
  const data=await getMusicBrainz('event/?'+new URLSearchParams({query,fmt:'json',limit:'25'}));
  return upcomingEventChoices(data.events,today);
 });
}
