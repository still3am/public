import {readAllPages} from './readPages.js';
// Membership lists are authorized by the server, including private playlists
// and owner blocks. Legacy rows alone never grant editing access.
export async function loadMyPlaylistList(client,uid,loadPlaylist){
 const ownedPromise=readAllPages(options=>client.entities.Playlist.filter({creator_id:uid},{sort:'-created_date',...options}));
 const sharedPromise=(async()=>{
  try{
   const response=await client.functions.invoke('securityGateway',{entity:'Playlist',action:'collaborationList',args:[]});
   if(!Array.isArray(response?.data?.result))throw Error('Shared playlists could not load.');
   return {rows:response.data.result,partial:false};
  }catch{
   // Keep owned playlists usable during service failures. Attempt old invites,
   // but verify each through the existing guarded playlist reader.
   const found=[];
   try{
    const legacy=await readAllPages(options=>client.entities.PlaylistCollaboration.filter({member_ids:uid},{...options}));
    for(const id of [...new Set(legacy.map(row=>row.playlist_id).filter(Boolean))]){
     try{const playlist=await loadPlaylist(id);if(playlist?.creator_id!==uid&&playlist?.collaborator_ids?.includes(uid))found.push(playlist);}catch{/* An obsolete invitation must not hide other playlists. */}
    }
   }catch{/* The partial flag exposes failed shared-list recovery. */}
   return {rows:found,partial:true};
  }
 })();
 const [owned,shared]=await Promise.all([ownedPromise,sharedPromise]);
 return {rows:[...new Map([...owned,...shared.rows].map(row=>[row.id,row])).values()],partial:shared.partial};
}
