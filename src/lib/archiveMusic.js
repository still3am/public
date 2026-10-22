// Internet Archive's public music metadata and complete downloadable MP3 files.
const MAX_AUDIO=80*1024*1024;
const metadataCache=new Map();
const first=value=>Array.isArray(value)?value[0]:value;
const text=value=>String(first(value)||'').replace(/&amp;/g,'&').replace(/<[^>]*>/g,'').slice(0,300);
const validIdentifier=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(id)&&id!=='.'&&id!=='..';
function validName(name){
 return typeof name==='string'&&name.length<=512&&!/[\\\x00-\x1f]/.test(name)&&!name.startsWith('/')&&!name.split('/').some(part=>part==='..'||part==='.');
}
function license(value){
 try{const url=new URL(first(value));return ['creativecommons.org','www.creativecommons.org'].includes(url.hostname)&&['http:','https:'].includes(url.protocol)?url.href.replace(/^http:/,'https:'):'';}catch{return '';}
}
function seconds(value){
 const parts=String(value||'').split(':').map(Number);return parts.every(Number.isFinite)?parts.reduce((total,part)=>total*60+part,0):0;
}
async function readBytes(response,max,onProgress){
 const size=Number(response.headers.get('content-length'))||0;
 if(size>max)throw Error('This file is too large to import (80 MB maximum).');
 if(!response.body?.getReader)throw Error('Your browser cannot safely import this file. Attach an audio file instead.');
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max)throw Error('This file exceeds the import size limit.');chunks.push(value);onProgress?.(total,size);}
 }catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 return {chunks,total};
}
async function json(url,signal){
 const response=await fetch(url,{signal:signal||AbortSignal.timeout(12000),credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok)throw Error('The full-track source is unavailable. Try again.');
 const {chunks}=await readBytes(response,3*1024*1024,null);
 return JSON.parse(await new Blob(chunks).text());
}
async function metadata(identifier){
 const cached=metadataCache.get(identifier);if(cached&&Date.now()-cached.at<180000)return cached.data;
 const data=await json('https://archive.org/metadata/'+encodeURIComponent(identifier));
 if(metadataCache.size>=30)metadataCache.delete(metadataCache.keys().next().value);
 metadataCache.set(identifier,{at:Date.now(),data});return data;
}
export function archiveTracks(identifier,data){
 if(!validIdentifier(identifier)||data?.is_dark||data?.metadata?.nodownload||data?.is_restricted)return [];
 const meta=data?.metadata||{};
 if(meta.mediatype!=='audio'||!Array.isArray(data.files))return [];
 const tracks=[],seen=new Set();
 // Prefer original MP3s; avoid listing an original and its derivative twice.
 const files=[...data.files].sort((a,b)=>Number(b.source==='original')-Number(a.source==='original'));
 for(const file of files){
  const name=file.name;
  if(!validName(name)||!name.toLowerCase().endsWith('.mp3')||file.private||Number(file.size)<=1024||Number(file.size)>MAX_AUDIO||!/mp3/i.test(file.format||''))continue;
  const duration=seconds(file.length);if(duration>0&&duration<40)continue;
  const title=text(file.title||name.replace(/\.mp3$/i,'').replace(/^\d+[-_. ]*/,'').replace(/_/g,' '));
  const artist=text(file.artist||file.creator||meta.creator),key=(title+'|'+artist).toLowerCase();
  if(seen.has(key))continue;seen.add(key);
  tracks.push({id:'archive:'+identifier+':'+encodeURIComponent(name),provider:'archive',title,artist,
   album_name:text(file.album||meta.title),release_year:Number(String(first(meta.date)||'').slice(0,4))||0,
   duration,explicit:false,content_rating:'unrated',cover_art_url:'https://archive.org/services/img/'+encodeURIComponent(identifier),
   source_url:'https://archive.org/details/'+encodeURIComponent(identifier),source_license_url:license(meta.licenseurl),
   source_attribution:[title,artist,text(meta.title)].filter(Boolean).join(' — '),
   audio_available:true,download_url:'https://archive.org/download/'+encodeURIComponent(identifier)+'/'+name.split('/').map(encodeURIComponent).join('/'),
   expected_bytes:Number(file.size)||0,track_number:Number(String(file.track||'').split('/')[0])||0});
  if(tracks.length>=30)break;
 }
 return tracks;
}
export async function searchArchiveMusic(query){
 const term=String(query||'').trim().slice(0,100);if(term.length<2)return [];
 /** @type {string[]} */
 const words=term.match(/[\p{L}\p{N}]+/gu)||[];if(!words.length)return [];
 const url=new URL('https://archive.org/advancedsearch.php');
 url.searchParams.set('q','mediatype:audio AND collection:netlabels AND ('+words.slice(0,10).map(word=>'"'+word+'"').join(' AND ')+')');
 url.searchParams.set('output','json');url.searchParams.set('rows','5');url.searchParams.set('fl[]','identifier');
 const data=await json(url.href),docs=data?.response?.docs;
 if(!Array.isArray(docs))throw Error('The full-track source returned an invalid response.');
 const ids=docs.map(doc=>doc.identifier).filter(validIdentifier);
 const results=[];let cursor=0,failures=0;
 async function worker(){while(cursor<ids.length){const identifier=ids[cursor++];try{results.push(...archiveTracks(identifier,await metadata(identifier)));}catch{failures++;}}}
 await Promise.all(Array.from({length:Math.min(2,ids.length)},worker));
 if(ids.length&&failures===ids.length)throw Error('Full-track details could not load. Try again.');
 const score=track=>words.filter(word=>(track.title+' '+track.artist+' '+track.album_name).toLowerCase().includes(word.toLowerCase())).length;
 return results.sort((a,b)=>score(b)-score(a)).slice(0,20);
}
export async function getArchiveSong(id){
 const match=String(id).match(/^archive:([^:]+):(.+)$/);
 if(!match||!validIdentifier(match[1]))throw Error('Invalid full-track selection. Search again.');
 let filename;try{filename=decodeURIComponent(match[2]);}catch{throw Error('Invalid track filename.');}
 if(!validName(filename))throw Error('Invalid track filename.');
 const track=archiveTracks(match[1],await metadata(match[1])).find(song=>song.id===id);
 if(!track)throw Error('This full track is no longer available for import.');
 return track;
}
/** @param {any} selection @param {{signal?: AbortSignal, onProgress?: (bytes: number,total: number)=>void}} options */
export async function downloadArchiveSong(selection,{signal,onProgress}={}){
 // Resolve again from metadata: never accept a caller-provided download URL.
 const song=await getArchiveSong(selection.id);
 const response=await fetch(song.download_url,{signal:signal||AbortSignal.timeout(60000),credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok||response.status===206)throw Error('The complete audio file could not download. Try again.');
 const type=(response.headers.get('content-type')||'').split(';')[0].trim();
 if(!['audio/mpeg','audio/mp3','application/octet-stream'].includes(type))throw Error('The source did not return an MP3 audio file.');
 const {chunks,total}=await readBytes(response,MAX_AUDIO,onProgress);
 if(total<1024||(song.expected_bytes&&total!==song.expected_bytes))throw Error('The audio download was incomplete. Please retry.');
 const file=new File(chunks,song.title.replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,120)+'.mp3',{type:'audio/mpeg'});
 const header=new Uint8Array(await file.slice(0,3).arrayBuffer());
 if(!((header[0]===0x49&&header[1]===0x44&&header[2]===0x33)||(header[0]===0xff&&(header[1]&0xe0)===0xe0)))throw Error('This download is not valid MP3 audio.');
 return {file,song};
}
