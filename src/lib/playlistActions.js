import {getPlaylist} from "@/lib/collaborativePlaylists";
import {base44,playlistDatabase} from '@/api/base44Client';
import {savePlaylistTracks} from '@/lib/nativePlaylistTracks';
export async function changePlaylist(id,action,ids,expected){
 const playlist=await getPlaylist(id);
 const saved=playlist.collaboration_enabled?(await base44.functions.invoke('securityGateway',{entity:'Playlist',action,args:[id,ids,expected]})).data.result:await savePlaylistTracks(playlistDatabase,id,action,ids,expected);
 window.dispatchEvent(new Event('playlists:changed'));return saved;
}
export const addPlaylistTracks=(id,ids)=>changePlaylist(id,'playlistAdd',[...new Set(ids)]);
export const removePlaylistTracks=(id,ids)=>changePlaylist(id,'playlistRemove',[...new Set(ids)]);
export const reorderPlaylistTracks=(id,ids,expected)=>changePlaylist(id,'playlistReorder',ids,expected);
export function movePlaylistTrack(ids,id,delta,visibleIds=[...new Set(ids)]){
 const position=visibleIds.indexOf(id),neighbor=visibleIds[position+delta];
 if(position<0||!neighbor)return [...ids];
 const moving=ids.filter(value=>value===id),remaining=ids.filter(value=>value!==id);
 const target=delta<0?remaining.indexOf(neighbor):remaining.lastIndexOf(neighbor)+1;
 if(target<0||!moving.length)return [...ids];
 remaining.splice(target,0,...moving);return remaining;
}
export function shufflePlaylist(tracks,random=Math.random){const out=[...tracks];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
