import {withReadTimeout} from './readTimeout.js';

// Recover once using a different source path. A failed local blob must not be
// recreated from the same cached bytes while an online stream is available.
export async function recoverPlaybackSource({track,failedUrl,online,getCached,getFresh,isCurrent,createObjectURL}) {
 if(!track?.id||!isCurrent())return null;
 const failedLocal=String(failedUrl||'').startsWith('blob:');
 if(!failedLocal){
  try{
   const cached=await withReadTimeout(getCached(),2500);
   if(!isCurrent())return null;
   if(cached?._blob?.size>0){const url=createObjectURL(cached._blob);return {url,blobUrl:url};}
  }catch{/* Continue with a fresh authorized stream. */}
 }
 if(!online||!isCurrent())return null;
 try{
  const fresh=await withReadTimeout(getFresh(),12000);
  if(!isCurrent()||typeof fresh?.audio_url!=='string'||!fresh.audio_url.trim())return null;
  return {url:fresh.audio_url,blobUrl:null};
 }catch{return null;}
}

export function playbackErrorMessage(error) {
 if(error?.name==='NotAllowedError')return 'Tap Play to start this song.';
 if(error?.name==='NotSupportedError')return 'This audio file could not be played. Try another song or report it to PUBLIC.';
 return 'Playback could not start. Tap Play to retry.';
}
