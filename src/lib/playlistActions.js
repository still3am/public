import {base44} from '@/api/base44Client';
export async function changePlaylist(id,action,ids,expected){
 const r=await base44.functions.invoke('securityGateway',{entity:'Playlist',action,args:[id,ids,expected]});
 if(!r.data?.result?.id)throw Error('Playlist update could not complete.');
 window.dispatchEvent(new Event('playlists:changed'));return r.data.result;
}
export const addPlaylistTracks=(id,ids)=>changePlaylist(id,'playlistAdd',[...new Set(ids)]);
export const removePlaylistTracks=(id,ids)=>changePlaylist(id,'playlistRemove',[...new Set(ids)]);
export const reorderPlaylistTracks=(id,ids,expected)=>changePlaylist(id,'playlistReorder',ids,expected);
export function movePlaylistTrack(ids,id,delta){const next=[...ids],from=next.indexOf(id),to=from+delta;if(from<0||to<0||to>=next.length)return next;[next[from],next[to]]=[next[to],next[from]];return next;}
export function shufflePlaylist(tracks,random=Math.random){const out=[...tracks];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
