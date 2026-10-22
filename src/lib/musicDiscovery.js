// Public metadata only. Direct provider JSONP avoids the app's credit-metered
// function gateway. Uploads continue through the protected upload pipeline.
const cache=new Map(),pending=new Map();
const TTL=180000;
let sequence=0;
const text=value=>String(value||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").slice(0,300);
function url(value,hosts){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&hosts.includes(u.hostname)?u.href:'';}catch{return '';}
}
export function normalizeDeezer(song){
 if(!song||!/^\d{1,20}$/.test(String(song.id))||!song.title||!song.artist?.name)return null;
 return {id:'deezer:'+song.id,provider:'deezer',title:text(song.title),artist:text(song.artist.name),
  album_name:text(song.album?.title),release_year:Number(String(song.release_date||'').slice(0,4))||0,
  duration:Number(song.duration)||0,explicit:song.explicit_lyrics===true,
  cover_art_url:url(song.album?.cover_big||song.album?.cover_medium,['cdn-images.dzcdn.net']),
  source_url:url(song.link,['www.deezer.com','deezer.com']),audio_available:false,
  track_number:Number(song.track_position)||0,disc_number:Number(song.disk_number)||0};
}
function normalizeApple(song){
 if(song?.kind!=='song'||!/^\d{1,20}$/.test(String(song.trackId)))return null;
 return {id:'itunes:'+song.trackId,provider:'itunes',title:text(song.trackName),artist:text(song.artistName),
  album_name:text(song.collectionName),release_year:Number(String(song.releaseDate||'').slice(0,4))||0,
  duration:Math.round(Number(song.trackTimeMillis||0)/1000),explicit:song.trackExplicitness==='explicit',
  cover_art_url:url(song.artworkUrl100,Array.from({length:5},(_,i)=>'is'+(i+1)+'-ssl.mzstatic.com')).replace(/100x100[^/]*?(?=\.)/,'600x600bb'),
  source_url:url(song.trackViewUrl,['music.apple.com','itunes.apple.com']),audio_available:false,
  genre:text(song.primaryGenreName),track_number:Number(song.trackNumber)||0,disc_number:Number(song.discNumber)||0};
}
function jsonp(endpoint,params){
 return new Promise((resolve,reject)=>{
  const callback='__publicMusic_'+Date.now()+'_'+sequence++;
  const script=document.createElement('script'),target=new URL(endpoint);
  for(const [key,value] of Object.entries({...params,callback}))target.searchParams.set(key,String(value));
  let finished=false;
  const finish=(error,data)=>{
   if(finished)return;finished=true;clearTimeout(timer);script.remove();script.onerror=null;
   // An already downloaded script may execute after cancellation or timeout.
   // Keep a short-lived no-op so that late responses cannot affect the page.
   window[callback]=()=>{};
   setTimeout(()=>{delete window[callback];},30000);
   if(error)reject(error);else resolve(data);
  };
  const timer=setTimeout(()=>finish(Error('Music search timed out. Try again.')),10000);
  window[callback]=data=>finish(null,data);
  script.onerror=()=>finish(Error('Music search could not connect. Check your connection and retry.'));
  script.src=target.href;script.async=true;script.referrerPolicy='no-referrer';
  document.head.appendChild(script);
 });
}
async function load(key,request){
 const hit=cache.get(key);if(hit&&Date.now()-hit.at<TTL)return hit.songs;
 if(pending.has(key))return pending.get(key);
 const job=request().then(songs=>{
  if(cache.size>=40)cache.delete(cache.keys().next().value);
  cache.set(key,{at:Date.now(),songs});return songs;
 }).finally(()=>pending.delete(key));
 pending.set(key,job);return job;
}
const allowed=(song,user)=>song&&(!song.explicit||(user?.show_explicit===true&&user?.adult_confirmed===true));
export async function searchDiscoveredMusic(query,user){
 const term=String(query||'').trim().slice(0,100);if(term.length<2)return [];
 const songs=await load('q:'+term.toLowerCase(),async()=>{
  const data=await jsonp('https://api.deezer.com/search',{q:term,limit:20,output:'jsonp'});
  if(data?.error||!Array.isArray(data?.data))throw Error('Music search is temporarily unavailable. Try again.');
  return data.data.map(normalizeDeezer).filter(Boolean);
 });
 return songs.filter(song=>allowed(song,user));
}
export async function getDiscoveredSong(id,user){
 if(!/^(?:deezer|itunes):\d{1,20}$/.test(String(id)))throw Error('Search again to select a song from the new music provider.');
 const songs=await load('id:'+id,async()=>{
  const [provider,number]=id.split(':');
  if(provider==='itunes'){
   const data=await jsonp('https://itunes.apple.com/lookup',{id:number,entity:'song',country:'US'});
   return Array.isArray(data?.results)?data.results.map(normalizeApple).filter(Boolean):[];
  }
  const data=await jsonp('https://api.deezer.com/track/'+number,{output:'jsonp'});
  if(data?.error)throw Error('This song is no longer available. Search again.');
  const song=normalizeDeezer(data);return song?[song]:[];
 });
 const song=songs.find(row=>row.id===id&&allowed(row,user));
 if(!song)throw Error('This song is unavailable or hidden by your content settings.');
 return song;
}
