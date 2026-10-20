// Move only the requested song; keep unavailable IDs and duplicate occurrences.
export function placePlaylistSong(ids,moving,target,after=false){
 if(!Array.isArray(ids)||!ids.includes(moving)||!ids.includes(target))throw Object.assign(Error('This playlist changed. Refresh and try again.'),{status:409});
 if(moving===target)return [...ids];
 const moved=ids.filter(id=>id===moving),rest=ids.filter(id=>id!==moving);
 const at=after?rest.lastIndexOf(target)+1:rest.indexOf(target);
 rest.splice(at,0,...moved);return rest;
}
export async function savePlaylistMove({load,save},moving,target,after=false){
 for(let attempt=0;attempt<3;attempt++){
  const current=await load(),before=current.track_ids||[],next=placePlaylistSong(before,moving,target,after);
  if(JSON.stringify(before)===JSON.stringify(next))return current;
  try{return await save(next,before);}
  catch(error){if((error.status??error.response?.status)!==409||attempt===2)throw error;}
 }
}
