import { useEffect, useState } from "react";

// Some older covers have no extension and use a generic content type.
// Keep their original URL while repairing the MIME type from image bytes.
// Shared requests and a bounded idle cache avoid repeated downloads.

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif|bmp|tiff?|svg)$/i;
const blobCache=new Map(),inflight=new Map(),users=new Map();
const MAX_IDLE_COVERS=96;
function trim(){let idle=[...blobCache.keys()].filter(key=>!users.get(key));while(idle.length>MAX_IDLE_COVERS){const key=idle.shift();URL.revokeObjectURL(blobCache.get(key));blobCache.delete(key);}}

function needsFix(url) {
  if (!url) return false;
  if (url.startsWith("blob:") || url.startsWith("data:")) return false;
  try{if(IMAGE_EXT_RE.test(new URL(url,window.location.origin).pathname))return false;}catch{}
  return true;
}

// Preserve the stored asset path. Adding an extension changes the filename
// and can turn a working extensionless image into a missing file.
function immediate(url){
 if(!url)return '';
 if(!needsFix(url))return url;
 return blobCache.get(url)||url;
}
function load(url){
 if(blobCache.has(url)){const value=blobCache.get(url);blobCache.delete(url);blobCache.set(url,value);return Promise.resolve(value);}
 if(inflight.has(url))return inflight.get(url);
 let request;
 request=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('Cover unavailable');
   let blob=await response.blob();
   if(!blob.type.startsWith('image/')){
    const bytes=new Uint8Array(await blob.slice(0,12).arrayBuffer());let mime;
    if(bytes[0]===0xff&&bytes[1]===0xd8)mime='image/jpeg';
    else if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)mime='image/png';
    else if(bytes[0]===0x47&&bytes[1]===0x49&&bytes[2]===0x46)mime='image/gif';
    else if(bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[8]===0x57&&bytes[9]===0x45)mime='image/webp';
    if(mime)blob=new Blob([blob],{type:mime});
   }
   if(!blob.size||!blob.type.startsWith('image/'))throw Error('Cover response was not an image');
   const value=URL.createObjectURL(blob);blobCache.set(url,value);trim();return value;
  }finally{clearTimeout(timer);}
 })().finally(()=>{if(inflight.get(url)===request)inflight.delete(url);});
 inflight.set(url,request);return request;
}
export function useCoverUrl(url){
 const [fixed,setFixed]=useState(()=>({source:url,value:immediate(url)}));
 useEffect(()=>{
  const ready=immediate(url);
  if(!url||!needsFix(url)){setFixed({source:url,value:ready});return;}
  let alive=true;users.set(url,(users.get(url)||0)+1);setFixed({source:url,value:ready});
  load(url).then(value=>{if(alive)setFixed({source:url,value});}).catch(()=>{if(alive)setFixed({source:url,value:url});});
  return()=>{alive=false;const count=(users.get(url)||1)-1;if(count)users.set(url,count);else users.delete(url);trim();};
 },[url]);
 return fixed.source===url?fixed.value:immediate(url);
}
