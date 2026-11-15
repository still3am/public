export const PROFILE_VIDEO_SECONDS = 10;
export const BANNER_VIDEO_SECONDS = 60;
export const profileMotionSeconds = kind => kind === "banner" ? BANNER_VIDEO_SECONDS : PROFILE_VIDEO_SECONDS;
export function validateMotionDuration(duration,kind="avatar"){
 const limit=profileMotionSeconds(kind);
 if(!Number.isFinite(duration)||duration<=0||duration>limit+.05)throw Error("Choose a video or GIF loop of "+limit+" seconds or less.");
}
export const PROFILE_VIDEO_BYTES = 25 * 1024 * 1024;
export const PROFILE_GIF_BYTES = 10 * 1024 * 1024;
export const PROFILE_MEDIA_ACCEPT = "image/*,video/mp4,video/webm,video/quicktime";
export const isGif = file => file?.type === "image/gif" || /\.gif$/i.test(file?.name || "");
export const isMotionFile = file => isGif(file) || file?.type?.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file?.name || "");
export function validateMotionFile(file) {
  if (!file || !file.size) throw Error("Choose a video or GIF from your device.");
  if (isGif(file)) {
    if (file.size > PROFILE_GIF_BYTES) throw Error("Choose a GIF under 10 MB.");
    return "gif";
  }
  if (!["video/mp4","video/webm","video/quicktime"].includes(file.type) && !(file.type === "" && /\.(mp4|webm|mov)$/i.test(file.name))) throw Error("Choose an MP4, WebM, MOV or GIF.");
  if (file.size > PROFILE_VIDEO_BYTES) throw Error("Choose a video under 25 MB.");
  return "video";
}
// Walk GIF blocks rather than searching compressed pixels for timing markers.
export function inspectGif(bytes,kind="avatar") {
  const limit=profileMotionSeconds(kind);
  if (bytes.length < 13 || !["GIF87a","GIF89a"].includes(String.fromCharCode(...bytes.slice(0,6)))) throw Error("This GIF could not be read.");
  const word = at => bytes[at] + bytes[at+1] * 256;
  const width=word(6),height=word(8);
  if (!width || !height || width>8192 || height>8192) throw Error("Choose a GIF no larger than 8192 pixels.");
  let p=13+(bytes[10]&128 ? 3*2**((bytes[10]&7)+1) : 0),duration=0,delay=100,frames=0;
  const skip = () => {while(p<bytes.length){const count=bytes[p++];if(!count)return;p+=count;if(p>bytes.length)throw Error("This GIF is incomplete.");}throw Error("This GIF is incomplete.");};
  while(p<bytes.length) {
    const block=bytes[p++];
    if(block===0x3b)break;
    if(block===0x21){const label=bytes[p++];if(label===0xf9){if(bytes[p]!==4||p+5>=bytes.length)throw Error("Invalid GIF timing.");delay=Math.max(20,word(p+2)*10);p+=6;}else skip();}
    else if(block===0x2c){if(p+9>bytes.length)throw Error("This GIF is incomplete.");const packed=bytes[p+8];p+=9;if(packed&128)p+=3*2**((packed&7)+1);p++;skip();duration+=delay;delay=100;frames++;if(duration>limit*1000)throw Error("Choose a GIF with a loop of "+limit+" seconds or less.");if(frames>limit*50)throw Error("This GIF has too many frames. Choose a GIF under "+(limit*50)+" frames.");}
    else throw Error("This GIF could not be read.");
  }
  if(!frames)throw Error("This GIF has no image frames.");
  return {width,height,duration:duration/1000,frames};
}
function posterFile(element,width,height,kind) {
  const max=kind==="banner"?1600:768,scale=Math.min(1,max/Math.max(width,height));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Your browser could not prepare this media.");
  ctx.drawImage(element,0,0,canvas.width,canvas.height);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],"profile-motion-poster.jpg",{type:"image/jpeg"})):reject(Error("Could not prepare the preview.")),"image/jpeg",.88));
}
export async function prepareProfileMotion(file,kind="avatar") {
  const type=validateMotionFile(file),url=URL.createObjectURL(file);
  let element,timer;
  try {
    let info;
    if(type==="gif") {
      info=inspectGif(new Uint8Array(await file.arrayBuffer()),kind);element=new Image();
      await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error("This GIF took too long to open.")),15000);element.onload=resolve;element.onerror=()=>reject(Error("This GIF could not be opened."));element.src=url;});
    } else {
      element=document.createElement("video");element.muted=true;element.playsInline=true;element.preload="auto";
      await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error("This video took too long to open. Try an MP4.")),15000);element.onloadeddata=resolve;element.onerror=()=>reject(Error("Your browser cannot play this video. Try an MP4."));element.src=url;element.load();});
      const {duration,videoWidth:width,videoHeight:height}=element;
      validateMotionDuration(duration,kind);
      if(!width||!height||width>8192||height>8192)throw Error("Choose a video no larger than 8192 pixels.");
      info={duration,width,height};
    }
    const poster=await posterFile(element,info.width,info.height,kind);
    return {file,poster,type,...info};
  } finally {
    clearTimeout(timer);
    if(type==="video"&&element instanceof HTMLVideoElement){element.pause();element.removeAttribute("src");element.load();}
    if(type==="gif"&&element)element.src="";
    URL.revokeObjectURL(url);
  }
}
