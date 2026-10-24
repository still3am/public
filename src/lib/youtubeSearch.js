const cache=new Map();
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{11}$/.test(id);
/** @param {any} track @param {string} key @param {{signal?:AbortSignal}} options */
export async function searchMusicVideos(track,key,{signal}={}){
 if(!key)throw Error('YouTube search is not configured.');
 const query=[track.artist,track.title,'official music video'].filter(Boolean).join(' ').slice(0,250);
 if(!track.artist||!track.title)return [];
 const cached=cache.get(query);if(cached&&Date.now()-cached.time<300000)return cached.items;
 const controller=new AbortController(),abort=()=>controller.abort();
 if(signal?.aborted)controller.abort();signal?.addEventListener('abort',abort,{once:true});
 const timeout=setTimeout(abort,12000);
 async function get(endpoint,params){
  const url=new URL('https://www.googleapis.com/youtube/v3/'+endpoint);
  url.search=new URLSearchParams({...params,key}).toString();
  const response=await fetch(url,{signal:controller.signal});
  const body=await response.json();
  if(!response.ok){
   const reason=body.error?.errors?.[0]?.reason;
   throw Error(reason==='quotaExceeded'||reason==='dailyLimitExceeded'?'YouTube search reached its daily limit. Try again tomorrow.':response.status===403||response.status===400?'YouTube search configuration needs attention.':'YouTube search is unavailable. Try again.');
  }return body;
 }
 try{
  const search=await get('search',{part:'snippet',type:'video',q:query,maxResults:'8',videoEmbeddable:'true',videoSyndicated:'true',videoCategoryId:'10'});
  const ids=(search.items||[]).map(item=>item.id?.videoId).filter(validId);
  if(!ids.length)return [];
  const details=await get('videos',{part:'snippet,status,contentDetails',id:ids.join(',')});
  const items=(details.items||[]).filter(item=>validId(item.id)&&item.status?.embeddable&&item.status?.privacyStatus==='public'&&!item.contentDetails?.contentRating?.ytRating).map(item=>({id:item.id,title:item.snippet.title,channel:item.snippet.channelTitle,thumbnail:item.snippet.thumbnails?.medium?.url||''}));
  cache.set(query,{time:Date.now(),items});if(cache.size>50)cache.delete(cache.keys().next().value);
  return items;
 }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
