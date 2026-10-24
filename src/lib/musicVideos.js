const cache=new Map();let cooldown=0,lastRequest=0;
const normalized=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function youtubeVideoId(value){
 try{const url=new URL(value);if(!['https:','http:'].includes(url.protocol))return '';const host=url.hostname.replace(/^www\./,'');let id='';
 if(host==='youtu.be')id=url.pathname.split('/')[1];
 else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)){id=url.searchParams.get('v')||(/^\/(?:embed|shorts)\//.test(url.pathname)?url.pathname.split('/')[2]:'');}
 return /^[A-Za-z0-9_-]{11}$/.test(id)?id:'';
 }catch{return '';}
}
const cleanTitle=value=>String(value||'').replace(/\s*[\[(]official\s+(?:audio|video)[\])]\s*/gi,' ').trim();
export function selectMusicVideo(rows,track){
 return rows.find(row=>normalized(cleanTitle(row.strTrack))===normalized(cleanTitle(track.title))&&normalized(row.strArtist)===normalized(track.artist)&&youtubeVideoId(row.strMusicVid))||null;
}
/** @param {any} track @param {{signal?:AbortSignal}} options */
export async function findMusicVideo(track,{signal}={}){
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
 const title=String(track.title||'').replace(/\s*[\[(]official\s+(?:audio|video)[\])]\s*/gi,' ').trim().slice(0,200),artist=String(track.artist||'').trim().slice(0,200);
 if(!title||!artist)return null;
 const key=JSON.stringify([title,artist]),hit=cache.get(key);if(hit&&hit.until>Date.now())return hit.value;
 if(Date.now()<cooldown)throw new Error('Video search is busy. Please retry in a minute.');
 const wait=Math.max(0,2000-(Date.now()-lastRequest));
 if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
 lastRequest=Date.now();
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(()=>controller.abort(),10000);
 try{
  const url=new URL('https://www.theaudiodb.com/api/v1/json/123/searchtrack.php');url.searchParams.set('s',artist);url.searchParams.set('t',title);
  const response=await fetch(url,{signal:controller.signal});
  if(response.status===429){cooldown=Date.now()+60000;throw new Error('Video search is busy. Please retry in a minute.');}
  if(!response.ok)throw new Error('Video search could not load. Please retry.');
  const data=await response.json();if(!Object.hasOwn(data,'track'))throw new Error('Video catalog is unavailable. Please retry.');
  const found=selectMusicVideo(Array.isArray(data.track)?data.track:[],{title,artist});
  const value=found?{id:youtubeVideoId(found.strMusicVid),title:found.strTrack,artist:found.strArtist}:null;
  if(cache.size>=50)cache.delete(cache.keys().next().value);cache.set(key,{until:Date.now()+(value?600000:60000),value});return value;
 }catch(error){if(signal?.aborted)throw new DOMException('Cancelled','AbortError');if(error.name==='AbortError')throw new Error('Video search timed out. Please retry.');throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
