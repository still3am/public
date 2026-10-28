const ROOT = 'https://lrclib.net';
const CLIENT = 'Public/1.0 (https://publicmusic.base44.app)';
const cache = new Map();
const choices = new Map();
const searches = new Map();
const signature = track => JSON.stringify([track.id,track.title,track.artist]);
export function chooseLyricsCatalogMatch(track,row) {
 if(!Number.isSafeInteger(row?.id)||!(lyricsResult(row)?.available||row?.instrumental===true))throw new Error("Choose a lyrics record first.");
 if(choices.size>=50)choices.delete(choices.keys().next().value);
 choices.set(signature(track),row);
 if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("lyrics:changed",{detail:{trackId:track.id}}));
}
export function clearLyricsCatalogMatch(track) {
 choices.delete(signature(track));
 if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("lyrics:changed",{detail:{trackId:track.id}}));
}
// Share a lookup between the song page and player. Cancelling one viewer must
// not cancel the other's request; cancel the provider only after both leave.
function joinSearch(entry,signal) {
 entry.consumers++;
 return new Promise((resolve,reject)=>{
  let finished=false;
  const release=()=>{if(finished)return false;finished=true;signal?.removeEventListener('abort',abort);entry.consumers--;if(!entry.consumers)entry.controller.abort();return true;};
  const abort=()=>{if(release())reject(cancelled());};
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}
  entry.promise.then(value=>{if(release())resolve(value);},error=>{if(release())reject(error);});
 });
}
let queue = Promise.resolve(), nextRequest = 0, cooldown = 0;
const cancelled = () => new DOMException('Cancelled', 'AbortError');
const normalize = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’‘']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const cleanLyricsTitle = value => String(value||'').replace(/\s*[\[(](?:official\s+(?:audio|video|music\s+video|lyric\s+video)|lyrics?\s+video)[\])]\s*/gi,' ').replace(/\s+/g,' ').trim();
export const primaryLyricsArtist = value => String(value||'').split(/\s+(?:feat\.?|ft\.?|featuring|with)\s+|,\s*|\s+&\s+|\s+x\s+/i)[0].trim();
const baseTitle = value => cleanLyricsTitle(value).replace(/\s*[\[(](?:feat\.?|ft\.?|featuring|with)\s+[^\])]+[\])]/gi,'').replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.+$/i,'').trim();
const version = value => (normalize(value).match(/\b(?:live|remix|acoustic|instrumental|slowed|sped up|nightcore|karaoke|demo|radio edit|extended|edit|remastered)\b/g)||[]).sort().join('|');
function candidateScore(row,track) {
 const title=normalize(baseTitle(track.title)),artist=normalize(track.artist),duration=Number(track.duration_seconds)||0;
 if(!title||!artist||normalize(baseTitle(row.trackName))!==title||version(row.trackName)!==version(track.title))return -1;
 const artistKey=value=>normalize(value).replace(/\b(?:and|feat|ft|featuring|with)\b/g,' ').replace(/\s+/g,' ').trim();
 const exactArtist=artistKey(row.artistName).split(" ").sort().join(" ")===artistKey(track.artist).split(" ").sort().join(" ");
 if(!exactArtist||!artist){if(normalize(primaryLyricsArtist(row.artistName))!==normalize(primaryLyricsArtist(track.artist)))return -1;}
 const difference=duration?Math.abs(Number(row.duration)-duration):0;
 if(duration&&(!Number.isFinite(difference)||difference>Math.min(5,Math.max(2,duration*.012))))return -1;
 const result=lyricsResult(row,Number(row.duration)||duration);
 if(!result?.available&&!row.instrumental)return -1;
 return 100+(exactArtist?30:20)+(result?.record?20:0)+(track.album_name&&normalize(row.albumName)===normalize(track.album_name)?8:0)-difference;
}
export function rankLyricsCandidates(rows,track) {
 const duration=Number(track.duration_seconds)||0;
 const scores=new Map(rows.map(row=>[row,candidateScore(row,track)]));
 return [...rows].sort((a,b)=>scores.get(b)-scores.get(a)||Number(normalize(b.trackName)===normalize(cleanLyricsTitle(track.title)))-Number(normalize(a.trackName)===normalize(cleanLyricsTitle(track.title)))||Number(normalize(b.artistName)===normalize(track.artist))-Number(normalize(a.artistName)===normalize(track.artist))||(duration?Number(Math.abs(b.duration-duration)<=2)-Number(Math.abs(a.duration-duration)<=2):0)||Number(!!b.syncedLyrics)-Number(!!a.syncedLyrics)||(duration?Math.abs(a.duration-duration)-Math.abs(b.duration-duration):0));
}
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
// Keep provider word timing when enhanced LRC supplies it; never estimate it.
function parseWordStamps(row,offset) {
 const body=row.replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g,'');
 const marks=[...body.matchAll(/<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>/g)];
 if(!marks.length||body.slice(0,marks[0].index).trim())return null;
 /** @type {Array<{text:string,start_time_ms:number,end_time_ms?:number}>} */
 const words=[];
 for(let i=0;i<marks.length;i++){
  const mark=marks[i];if(Number(mark[2])>=60)return null;
  const start=Math.max(0,Math.round((Number(mark[1])*60+Number(mark[2])+Number('0.'+(mark[3]||'0')))*1000-offset));
  if(i&&start<=words.at(-1)?.start_time_ms)return null;
  const value=body.slice(mark.index+mark[0].length,marks[i+1]?.index??body.length);
  if(words.length)words[words.length-1].end_time_ms=start;
  if(value.trim())words.push({text:value,start_time_ms:start});
 }
 return words.length?words:null;
}
export function parseLrc(value, duration = 0) {
  if(typeof value!=='string')return [];
  const offset=Number(value.match(/\[offset:([+-]?\d+)\]/i)?.[1])||0;
  const lines=[];
  for(const row of value.slice(0,100000).replace(/\r\n?/g,'\n').split('\n')){
    const stamps=[...row.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const lyric=row.replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g,'').replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g,'').trim();
    const words=stamps.length===1?parseWordStamps(row,offset):null;
    for(const stamp of stamps){if(Number(stamp[2])>=60)continue;const ms=Math.max(0,Math.round((Number(stamp[1])*60+Number(stamp[2])+Number('0.'+(stamp[3]||'0')))*1000-offset));if(duration>0&&ms>duration*1000+2000)continue;lines.push({text:lyric||'♪',start_time_ms:ms,...(words?{words}: {})});}
    if(lines.length>=2000)break;
  }
  const grouped=[];
  for(const line of lines.sort((a,b)=>a.start_time_ms-b.start_time_ms)){
   const previous=grouped.at(-1);
   if(previous?.start_time_ms===line.start_time_ms){if(previous.text!==line.text){if(previous.text==='♪')previous.text=line.text;else if(line.text!=='♪'){previous.text+=' / '+line.text;delete previous.words;}}continue;}
   grouped.push({...line});
  }
  return grouped.slice(0,2000).map((line,index,all)=>{
   const end=all[index+1]?.start_time_ms??Math.max(line.start_time_ms+1000,Math.round(duration*1000)||line.start_time_ms+4000);
   const words=line.words?.map(word=>({...word,end_time_ms:word.end_time_ms??end}));
   const valid=words?.every(word=>word.start_time_ms>=line.start_time_ms&&word.end_time_ms>word.start_time_ms&&word.end_time_ms<=end);
   const rest={...line};delete rest.words;
   return {...rest,end_time_ms:end,...(valid?{words,preserve_word_spacing:true}:{})};
  });
}
export function selectLyricsMatch(rows,track) {
 const matches=rows.map(row=>({row,score:candidateScore(row,track)})).filter(item=>item.score>=0).sort((a,b)=>b.score-a.score);
 if(!Number(track.duration_seconds)&&new Set(matches.map(item=>Math.round(Number(item.row.duration)))).size>1)return null;
 return matches[0]?.row||null;
}
/** @param {any} track @param {{signal?:AbortSignal,broad?:boolean,titleOnly?:boolean}} options @returns {Promise<any[]>} */
export async function searchLyricsCatalog(track, {signal,broad=false,titleOnly=false} = {}) {
  const title=cleanLyricsTitle(track.title).slice(0,200),artist=String(track.artist||'').trim().slice(0,200);
  if(!title||!artist)return [];
  if(signal?.aborted)throw cancelled();
  const key=JSON.stringify([title,artist,broad,titleOnly]);const saved=cache.get(key);
  if(saved&&saved.until>Date.now())return saved.rows;
  let entry=searches.get(key);
  if(!entry||entry.controller.signal.aborted){
    entry={controller:new AbortController(),consumers:0,promise:null};
    const current=entry;
    current.promise=(async()=>{
      const result=await request('/api/search?'+new URLSearchParams(titleOnly?{q:title}:broad?{q:title+' '+artist}:{track_name:title,artist_name:artist}),{signal:current.controller.signal});
      if(!Array.isArray(result))throw new Error('Unexpected lyrics response. Please retry.');
      const rows=result.filter(row=>row&&typeof row==='object'&&Number.isSafeInteger(row.id)&&row.id>0).slice(0,200).map(row=>({...row,plainLyrics:text(row.plainLyrics),syncedLyrics:text(row.syncedLyrics)}));
      if(cache.size>=50)cache.delete(cache.keys().next().value);
      cache.set(key,{until:Date.now()+(rows.length?600000:30000),rows});return rows;
    })().finally(()=>{if(searches.get(key)===current)searches.delete(key);});
    searches.set(key,current);
  }
  return joinSearch(entry,signal);
}
/** @param {any} track @param {{signal?:AbortSignal}} options */
export async function searchLyricsOptions(track,{signal}={}) {
 let rows=[],failure=null;
 try{rows=await searchLyricsCatalog(track,{signal});}catch(error){if(signal?.aborted||error.name==='AbortError')throw error;failure=error;}
 if(!rows.some(row=>lyricsResult(row)?.available||row.instrumental===true)){
  try{rows.push(...await searchLyricsCatalog({...track,title:baseTitle(track.title),artist:primaryLyricsArtist(track.artist)},{signal,broad:true}));}
  catch(error){if(signal?.aborted||error.name==='AbortError')throw error;failure=error;}
 }
 if(!rows.length&&failure)throw failure;
 return rankLyricsCandidates([...new Map(rows.map(row=>[row.id,row])).values()],track);
}
export function lyricsResult(row, duration = 0) {
  if(!row)return null;
  const lines=parseLrc(row.syncedLyrics,Number(duration)||Number(row.duration)||0);
  const plain=text(row.plainLyrics)||lines.filter(line=>line.text!=='♪').map(line=>line.text).join('\n');
  const timed=lines.length>=2&&lines.some(line=>line.text!=='♪')&&lines.some(line=>line.start_time_ms>lines[0].start_time_ms);
  return {text:plain,record:timed?{lines}:null,source:'LRCLIB',sourceId:row.id,instrumental:row.instrumental===true,available:!!plain||lines.length>0};
}
/** @param {any} track @param {{signal?:AbortSignal}} options */
export async function findLyricsCatalog(track, options = {}) {
  if(options.signal?.aborted)throw cancelled();
  const chosen=choices.get(signature(track));
  if(chosen)return lyricsResult(chosen,chosen.duration);
  const rows=[];let failure=null;
  const lookup=async(input,settings)=>{try{return await searchLyricsCatalog(input,settings);}catch(error){if(options.signal?.aborted||error.name==='AbortError')throw error;failure=error;return [];}};
  rows.push(...await lookup(track,options));
  let best=selectLyricsMatch(rows,track);
  if(lyricsResult(best,track.duration_seconds)?.record)return lyricsResult(best,track.duration_seconds);
  const alternate={...track,title:baseTitle(track.title),artist:primaryLyricsArtist(track.artist)};
  if(alternate.title!==cleanLyricsTitle(track.title)||alternate.artist!==track.artist){
   rows.push(...await lookup(alternate,options));best=selectLyricsMatch(rows,track);
   if(lyricsResult(best,track.duration_seconds)?.record)return lyricsResult(best,track.duration_seconds);
  }
  rows.push(...await lookup(alternate,{...options,broad:true}));
  best=selectLyricsMatch(rows,track);
  // Some catalog searches index names without accents. Try that spelling only
  // after the original queries, then validate against the original recording.
  const unaccent=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'');
  const spelling={...alternate,title:unaccent(alternate.title),artist:unaccent(alternate.artist)};
  if(!lyricsResult(best,track.duration_seconds)?.record&&(spelling.title!==alternate.title||spelling.artist!==alternate.artist)){
   rows.push(...await lookup(spelling,options));best=selectLyricsMatch(rows,track);
  }
  // A punctuation-neutral query finds uploads whose artist/title formatting
  // differs from the catalog. A final title-only query recovers collaborations
  // indexed under a different lead artist. Both retain original match guards.
  if(!lyricsResult(best,track.duration_seconds)?.record){
   const simple={...alternate,title:normalize(alternate.title),artist:normalize(alternate.artist)};
   if(simple.title!==alternate.title||simple.artist!==alternate.artist){
    rows.push(...await lookup(simple,{...options,broad:true}));best=selectLyricsMatch(rows,track);
   }
  }
  if(!lyricsResult(best,track.duration_seconds)?.record){
   rows.push(...await lookup(alternate,{...options,titleOnly:true}));best=selectLyricsMatch(rows,track);
  }
  const result=lyricsResult(best,track.duration_seconds);
  if(!result&&failure)throw failure;
  return result;
}
