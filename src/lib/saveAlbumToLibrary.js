import {readLibraryRows} from './libraryRows.js';
// Add-only: retries retain songs already saved, including a partially completed album.
export async function saveAlbumToLibrary(handler,userId,tracks,isCurrent=()=>true){
 let added=0;
 for(const track of [...new Map(tracks.filter(t=>t?.id).map(t=>[t.id,t])).values()]){
  if(!isCurrent())return {added,cancelled:true};
  const saved=await readLibraryRows(handler,{user_id:userId,track_id:track.id},{one:true});
  if(!isCurrent())return {added,cancelled:true};
  if(saved.length)continue;
  const row=await handler.create({user_id:userId,track_id:track.id});
  if(!row?.id)throw Error('The library save was not confirmed');
  added++;
 }
 return {added,cancelled:!isCurrent()};
}
