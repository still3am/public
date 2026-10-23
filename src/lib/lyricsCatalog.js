const ROOT = 'https://lrclib.net';
const CLIENT = 'Public/1.0 (https://publicnet.base44.app)';
const cache = new Map();
const choices = new Map();
const signature = track => JSON.stringify([track.id,track.title,track.artist,track.duration_seconds]);
export function chooseLyricsCatalogMatch(track,row) {
 if(!Number.isSafeInteger(row?.id)||!lyricsResult(row)?.available)throw new Error("Choose a lyrics record first.");
 if(choices.size>=50)choices.delete(choices.keys().next().value);
 choices.set(signature(track),row);
 if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("lyrics:changed",{detail:{trackId:track.id}}));
}
let queue = Promise.resolve(), nextRequest = 0, cooldown = 0;
const cancelled = () => new DOMException('Cancelled', 'AbortError');
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const text = value => typeof value === 'string' ? value.slice(0,100000).trim() : '';
/** @param {string} path @param {{signal?:AbortSignal}} options */
async function request(path, {signal} = {}) {
  const job = queue.catch(()=>{}).then(async()=>{
    if(signal?.aborted)throw cancelled();
    if(Date.now()<cooldown)throw new Error('Lyrics service is busy. Please retry later.');
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,nextRequest-Date.now())));
    if(signal?.aborted)throw cancelled();
    const controller=new AbortController();
    const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch(ROOT+path,{headers:{'Lrclib-Client':CLIENT},signal:controller.signal});
      if(response.status===429){const delay=Number(response.headers.get('Retry-After'));cooldown=Date.now()+Math.max(1,Number.isFinite(delay)&&delay>0?delay:60)*1000;throw new Error('Lyrics service is busy. Please retry later.');}
      if(!response.ok)throw new Error('Lyrics could not load. Please retry.');
      return await response.json();
    } catch(error){if(signal?.aborted)throw cancelled();if(error.name==='AbortError')throw new Error('Lyrics lookup timed out. Please retry.');throw error;}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);nextRequest=Date.now()+300;}
  });
  queue=job.then(()=>{},()=>{});return job;
}
export function parseLrc(value, duration = 0) {
  if(typeof value!=='string')return [];
  const offset=Number(value.match(/\[offset:([+-]?\d+)\]/i)?.[1])||0;
  const lines=[];
  for(const row of value.slice(0,100000).replace(/\r/g,'').split('\n')){
    const stamps=[...row.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const lyric=row.replace(/\[[^\]]*\]/g,'').trim();
    for(const stamp of stamps){if(Number(stamp[2])>=60)continue;const ms=Math.max(0,Math.round((Number(stamp[1])*60+Number(stamp[2])+Number('0.'+(stamp[3]||'0')))*1000-offset));if(duration>0&&ms>duration*1000+2000)continue;lines.push({text:lyric||'♪',start_time_ms:ms});}
    if(lines.length>=2000)break;
  }
  return lines.sort((a,b)=>a.start_time_ms-b.start_time_ms).slice(0,2000).map((line,index,all)=>({...line,end_time_ms:all[index+1]?.start_time_ms??Math.max(line.start_time_ms+1000,Math.round(duration*1000)||line.start_time_ms+4000)}));
}
export function selectLyricsMatch(rows, track) {
  const title=normalize(track.title),artist=normalize(track.artist),duration=Number(track.duration_seconds)||0;
  if(!title||!artist)return null;
  const matches=rows.filter(row=>normalize(row.trackName)===title&&normalize(row.artistName)===artist&&(row.instrumental||text(row.plainLyrics)||text(row.syncedLyrics))&&(!duration||Number.isFinite(Number(row.duration))&&Math.abs(Number(row.duration)-duration)<=2));
  matches.sort((a,b)=>(duration?Math.abs(a.duration-duration)-Math.abs(b.duration-duration):0)||(normalize(b.albumName)===normalize(track.album_name)?1:0)-(normalize(a.albumName)===normalize(track.album_name)?1:0)||Number(!!b.syncedLyrics)-Number(!!a.syncedLyrics));
  if(!duration&&new Set(matches.map(row=>Math.round(Number(row.duration)))).size>1)return null;
  return matches[0]||null;
}
/** @param {any} track @param {{signal?:AbortSignal}} options @returns {Promise<any[]>} */
export async function searchLyricsCatalog(track, {signal} = {}) {
  const title=String(track.title||'').trim().slice(0,200),artist=String(track.artist||'').trim().slice(0,200);
  if(!title||!artist)return [];
  if(signal?.aborted)throw cancelled();
  const key=JSON.stringify([title,artist]);const saved=cache.get(key);
  if(saved&&saved.until>Date.now())return saved.rows;
  const result=await request('/api/search?'+new URLSearchParams({track_name:title,artist_name:artist}),{signal});
  if(!Array.isArray(result))throw new Error('Unexpected lyrics response. Please retry.');
  const rows=result.filter(row=>Number.isSafeInteger(row.id)&&row.id>0).slice(0,50).map(row=>({...row,plainLyrics:text(row.plainLyrics),syncedLyrics:text(row.syncedLyrics)}));
  if(cache.size>=50)cache.delete(cache.keys().next().value);cache.set(key,{until:Date.now()+600000,rows});return rows;
}
export function lyricsResult(row, duration = 0) {
  if(!row)return null;
  const lines=parseLrc(row.syncedLyrics,Number(duration)||Number(row.duration)||0);
  const plain=text(row.plainLyrics)||lines.filter(line=>line.text!=='♪').map(line=>line.text).join('\n');
  return {text:plain,record:lines.length?{lines}:null,source:'LRCLIB',sourceId:row.id,instrumental:row.instrumental===true,available:!!plain||lines.length>0};
}
/** @param {any} track @param {{signal?:AbortSignal}} options */
export async function findLyricsCatalog(track, options = {}) {
  if(options.signal?.aborted)throw cancelled();
  const chosen=choices.get(signature(track));
  if(chosen)return lyricsResult(chosen,chosen.duration);
  const rows=await searchLyricsCatalog(track,options);return lyricsResult(selectLyricsMatch(rows,track),track.duration_seconds);
}
