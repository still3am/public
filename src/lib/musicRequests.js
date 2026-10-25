import {base44} from '@/api/base44Client';
const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export const musicRequestIdentity=(title,artist)=>normalize(title)+'::'+String(artist||'').split(/\s*(?:,|&|;)\s*|\s+(?:feat\.?|ft\.?|featuring|with|and)\s+/i).map(normalize).filter(Boolean).sort().join('|');
export async function musicRequestAction(action,values={}){
 const response=await base44.functions.invoke('music-requests',{...values,action}),data=response?.data;
 if(action==='list'){if(!Array.isArray(data?.requests))throw Error('Music requests could not load. Please retry.');}
 else if(data?.success!==true)throw Error('Your change was not confirmed. Please retry.');
 return data;
}
export const musicRequestError=error=>error?.response?.data?.error||error?.message||'Music Requests is unavailable. Please retry.';
