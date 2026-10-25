import {base44} from '@/api/base44Client';
const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export const musicRequestIdentity=(title,artist)=>normalize(title)+'::'+String(artist||'').split(/\s*(?:,|&|;)\s*|\s+(?:feat\.?|ft\.?|featuring|with|and)\s+/i).map(normalize).filter(Boolean).sort().join('|');
const serviceLimitCodes = /(?:credits_exhausted|integration_credits_limit_reached|premium_required|credit_limit_reached)/i;
export function isMusicRequestServiceLimit(error) {
 const data = error?.response?.data;
 return Number(error?.response?.status ?? error?.status) === 402 || serviceLimitCodes.test([error?.code, typeof data?.error === 'string' ? data.error : data?.error?.code, data?.code].filter(Boolean).join(' '));
}
let serviceFailure = null;
export function resetMusicRequestService() {serviceFailure = null;}
/** A manual Retry can probe restoration; background calls pause after a service limit. */
export async function musicRequestAction(action,values={},options={retry:false}){
 if(serviceFailure && !options.retry) throw serviceFailure;
 let data;
 try {
  const response=await base44.functions.invoke('music-requests',{...values,action});data=response?.data;
  if(action==='list'){if(!Array.isArray(data?.requests))throw Error('Music requests could not load. Please retry.');}
  else if(data?.success!==true)throw Error('Your change was not confirmed. Please retry.');
  if(action==='preview_song'||action==='preview_playlist'){const preview=data?.preview;if(!preview||typeof preview.title!=='string'||typeof preview.artist!=='string'||(action==='preview_playlist'&&(!Array.isArray(preview.playlist_tracks)||preview.playlist_tracks.some(t=>typeof t?.title!=='string'||typeof t?.artist!=='string'))))throw Error('Music details could not load. Please retry.');}
 } catch(error) {
  if(isMusicRequestServiceLimit(error))serviceFailure=error;
  throw error;
 }
 serviceFailure=null;
 return data;
}
export function musicRequestError(error) {
 if(isMusicRequestServiceLimit(error))return 'Not available at the moment.';
 const detail=error?.response?.data?.error;
 if(typeof detail==='string'&&detail.trim())return detail;
 if(typeof detail?.message==='string'&&detail.message.trim())return detail.message;
 return typeof error?.message==='string'&&error.message.trim()?error.message:'Music Requests is unavailable. Please retry.';
}
