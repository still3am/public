import {base44} from '@/api/base44Client';
import {findLyricsCatalog,parseLrc} from './lyricsCatalog.js';
import {validateTimedLyrics} from './saveTimedLyrics.js';

const rows = page => Array.isArray(page) ? page : page?.items || [];
const aborted = signal => {if(signal?.aborted)throw new DOMException('Cancelled','AbortError');};

// Only the existing permission-filtered, approved records may supplement LRCLIB.
export async function resolveLyrics(track,{signal}={},client=base44,lookup=findLyricsCatalog){
 aborted(signal);
 let saved=null;
 const raw=typeof track.lyrics_text==='string'?track.lyrics_text.slice(0,100000).trim():'';
 if(raw){
  const lines=parseLrc(raw,Number(track.duration_seconds)||0);
  const timed=lines.length>1&&lines.some(line=>line.start_time_ms>0);
  saved={available:true,source:'PUBLIC',text:timed?lines.map(line=>line.text).join('\n'):raw,record:timed?{lines}:null};
 }
 try{
  const records=rows(await client.entities.Lyrics.filter({track_id:track.id,status:'approved'},'-updated_date',20));
  aborted(signal);
  for(const row of records){
   if(row.track_id!==track.id||row.status!=='approved')continue;
   try{
    const lines=validateTimedLyrics(row.lines);
    const timed=!row.out_of_sync&&lines.some(line=>line.start_time_ms>0)&&lines.every(line=>!track.duration_seconds||line.start_time_ms<=Number(track.duration_seconds)*1000+2000);
    if(!saved||timed)saved={available:true,source:'PUBLIC',text:lines.map(line=>line.text).join('\n'),record:timed?{lines}:null};
    if(timed)break;
   }catch{/* Invalid historical records cannot break playback. */}
  }
 }catch(error){aborted(signal);}
 if(saved?.record)return saved;
 try{
  const result=await lookup(track,{signal});aborted(signal);
  return result?.available||result?.instrumental?result:saved;
 }catch(error){
  aborted(signal);
  if(saved)return {...saved,providerUnavailable:true};
  throw error;
 }
}
