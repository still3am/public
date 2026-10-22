// Apple-hosted MusicKit only. The developer JWT is public; its signing key
// must stay outside the app repository. Individual Music User Tokens stay in MusicKit.
let loading=null,configured=null;
export function validateAppleToken(token,origin,now=Date.now()){
 try{
  const [head,body,signature]=String(token||'').split('.');
  if(!head||!body||!signature)throw Error();
  const decode=value=>JSON.parse(atob(value.replace(/-/g,'+').replace(/_/g,'/')));
  const header=decode(head),claims=decode(body);
  if(header.alg!=='ES256'||!header.kid||!claims.iss||!Number.isFinite(claims.exp)||claims.exp*1000<=now+60000)throw Error();
  if(Array.isArray(claims.origin)&&!claims.origin.includes(origin))throw Error();
  return token;
 }catch{throw Error('Apple Music setup is incomplete or needs renewal.');}
}
export async function appleMusicReady(){
 const response=await fetch('/apple-music-config.json',{cache:'no-store',credentials:'same-origin'});
 if(!response.ok)throw Error('Apple Music configuration is unavailable.');
 const config=await response.json();
 return validateAppleToken(config.developerToken,window.location.origin);
}
export async function loadAppleMusic(){
 if(configured)return configured;
 if(loading)return loading;
 loading=(async()=>{
  const developerToken=await appleMusicReady();
  if(!window['MusicKit'])await new Promise((resolve,reject)=>{
   let script=document.querySelector('script[data-public-musickit]');
   const timer=setTimeout(()=>{cleanup();script?.remove();reject(Error('Apple Music could not load. Try again.'));},15000);
   const ready=()=>{cleanup();resolve(null);};
   const error=()=>{cleanup();script?.remove();reject(Error('Apple Music could not connect.'));};
   const cleanup=()=>{clearTimeout(timer);document.removeEventListener('musickitloaded',ready);script?.removeEventListener('error',error);};
   document.addEventListener('musickitloaded',ready,{once:true});
   if(!script){script=document.createElement('script');script.setAttribute('data-public-musickit','');script.src='https://js-cdn.music.apple.com/musickit/v3/musickit.js';script.async=true;document.head.appendChild(script);}
   script.addEventListener('error',error,{once:true});
  });
  const kit=window['MusicKit'];if(!kit)throw Error('Apple Music could not initialize.');
  await kit.configure({developerToken,app:{name:'Public',build:'1.0.0'}});
  configured=kit.getInstance();return configured;
 })().catch(error=>{loading=null;throw error;});
 return loading;
}
export async function searchAppleMusic(music,term,user){
 const query=String(term||'').trim().slice(0,100);if(query.length<2)return [];
 const storefront=/^[a-z]{2}$/.test(music.storefrontId||'')?music.storefrontId:'us';
 const response=await music.api.music('/v1/catalog/'+storefront+'/search',{term:query,types:'songs',limit:20});
 const rows=response?.data?.results?.songs?.data;
 if(!Array.isArray(rows))throw Error('Apple Music search is unavailable. Try again.');
 return rows.filter(song=>song.type==='songs'&&song.attributes&&
  (song.attributes.contentRating!=='explicit'||(user?.show_explicit===true&&user?.adult_confirmed===true)));
}
export function appleArtwork(song){
 const artwork=song?.attributes?.artwork?.url;if(!artwork)return '';
 try{const u=new URL(artwork.replace('{w}','160').replace('{h}','160'));
 return u.protocol==='https:'&&u.hostname.endsWith('.mzstatic.com')&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
export async function disconnectAppleMusic(){
 if(configured){try{await configured.stop();}finally{await configured.unauthorize();}}
}
