import {lyricsResult} from './lyricsCatalog.js';
export const lyricsFingerprint = track => JSON.stringify([String(track.title||'').trim(),String(track.artist||'').trim(),Math.round((Number(track.duration_seconds)||0)*1000),String(track.album_name||'').trim()]);
const rows=value=>Array.isArray(value)?value:value?.items||[];
// Only the server writes shared records. No browser-supplied lyric text is saved.
export function createSharedLyricsService(client,lookup,notify=(_detail)=>{}) {
 const memory=new Map(),pending=new Map();
 const emit=(track,key,result)=>{memory.set(key,{until:Date.now()+120000,result});notify({trackId:track.id,result});};
 async function load(track,key) {
  const fingerprint=lyricsFingerprint(track);
  try {
   const found=rows(await client.entities.CatalogLyrics.filter({track_id:track.id,fingerprint},'-updated_date',1))[0];
   if(found?.synced_lyrics){const result=lyricsResult({id:found.source_id,syncedLyrics:found.synced_lyrics,duration:found.duration_seconds},track.duration_seconds);if(result?.available&&result.record?.lines?.length)return {...result,cacheStatus:'shared'};}
  } catch { /* A failed shared read must not prevent provider lookup. */ }
  const result=await lookup(track);
  if(!result?.available||!result.record?.lines?.length)return result;
  // Store in the background so music and lyric display never wait for persistence.
  const playable={...result,cacheStatus:'saving'};memory.set(key,{until:Date.now()+120000,result:playable});
  Promise.resolve().then(()=>client.functions.invoke('cacheCatalogLyrics',{track_id:track.id,source_id:result.sourceId})).then(response=>{
   if(response?.data?.cached!==true)throw Error('Shared save was not confirmed');
   emit(track,key,{...result,cacheStatus:'shared'});
  }).catch(()=>emit(track,key,{...result,cacheStatus:'unavailable',cacheMessage:'Lyrics loaded. Shared saving is unavailable; Public will retry on your next visit.'}));
  return playable;
 }
 /** @param {any} track @param {{signal?:AbortSignal}} options */
 return async function get(track,{signal}={}) {
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  if(!track?.id)return lookup(track,{signal});
  const key=track.id+':'+lyricsFingerprint(track),cached=memory.get(key);
  if(cached&&cached.until>Date.now())return cached.result;
  if(!pending.has(key)){
   const job=load(track,key).then(result=>{if(memory.size>=60)memory.delete(memory.keys().next().value);if(!memory.has(key))memory.set(key,{until:Date.now()+120000,result});return result;}).finally(()=>pending.delete(key));pending.set(key,job);
  }
  const result=await pending.get(key);if(signal?.aborted)throw new DOMException('Cancelled','AbortError');return result;
 };
}
