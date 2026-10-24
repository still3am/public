let pending=null;
export function youtubeErrorMessage(code){
 if([101,150].includes(Number(code)))return 'The video owner does not allow playback inside other apps. Watch it on YouTube instead.';
 if(Number(code)===100)return 'This video was removed or made private. Try searching YouTube.';
 if(Number(code)===153)return 'YouTube could not verify this browser’s embedded player. Open the video on YouTube.';
 return 'This video could not play here. Retry or open it on YouTube.';
}
export function youtubeEmbedUrl(id,origin){
 if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw Error('Invalid YouTube video');
 const url=new URL('https://www.youtube-nocookie.com/embed/'+id);
 url.searchParams.set('enablejsapi','1');url.searchParams.set('playsinline','1');url.searchParams.set('rel','0');
 if(/^https?:\/\//.test(origin))url.searchParams.set('origin',new URL(origin).origin);
 return url.href;
}
export function loadYouTubePlayer(){
 const host=/** @type {any} */(window);
 if(host.YT?.Player)return Promise.resolve(host.YT);
 if(pending)return pending;
 pending=new Promise((resolve,reject)=>{
  const previous=host.onYouTubeIframeAPIReady,script=document.createElement('script');
  let done=false;
  const finish=error=>{if(done)return;done=true;clearTimeout(timer);host.onYouTubeIframeAPIReady=previous;if(error){pending=null;script.remove();reject(error);}else resolve(host.YT);};
  const timer=setTimeout(()=>finish(Error('YouTube player did not load. Retry or open on YouTube.')),12000);
  host.onYouTubeIframeAPIReady=()=>{try{previous?.();}finally{finish(host.YT?.Player?null:Error('YouTube player unavailable.'));}};
  script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=()=>finish(Error('YouTube player is blocked or unavailable. Open on YouTube.'));document.head.appendChild(script);
 });
 return pending;
}
