// Membership changes contain only account IDs. Playlist RLS/FLS independently
// limits these writes to its owner/admin; all other fields stay protected.
const rows=page=>{if(Array.isArray(page))return page;if(Array.isArray(page?.items))return page.items;throw Error('Collaborators could not load. Please retry.');};
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const locks=new Map();
export function savePlaylistInvitation(database,playlistId,memberId,add){
 if(typeof playlistId!=='string'||!playlistId||typeof memberId!=='string'||!memberId||memberId.length>100||typeof add!=='boolean')return Promise.reject(Error('Choose a collaborator.'));
 const key=playlistId+':'+memberId,prior=locks.get(key);
 if(prior)return prior.add===add?prior.promise:Promise.reject(Error('This invitation is already saving.'));
 const promise=(async()=>{
  const actor=await database.auth.me();
  if(!actor?.id||actor.disabled||actor.is_blocked)fail('Sign in with an active account.',401);
  const check=async()=>{const now=await database.auth.me();if(now?.id!==actor.id||now.disabled||now.is_blocked)fail('Your account changed. Reopen this playlist.',403);};
  const {Playlist,PlaylistCollaboration,PublicProfile,Block}=database.entities;
  const playlist=await Playlist.get(playlistId);
  if(playlist.creator_id!==actor.id)fail('Only the playlist owner can invite collaborators.',403);
  if(memberId===actor.id)fail('The owner already has access.');
  if(add){
   const targets=rows(await PublicProfile.filter({user_id:memberId,visible:true},'-updated_date',1));
   if(!targets.length)fail('This listener is no longer available.',404);
   const blocks=rows(await Block.filter({$or:[{user_id:actor.id,blocked_user_id:memberId},{user_id:memberId,blocked_user_id:actor.id}]},'-created_date',1));
   if(blocks.length)fail('Invitations are unavailable between blocked accounts.',403);
  }
  // Migrate legacy members once; an atomic conditional write prevents overwriting
  // another tab's migration or resurrecting a member after their removal.
  if(!Array.isArray(playlist.collaborator_ids)){
   const legacy=rows(await PlaylistCollaboration.filter({playlist_id:playlistId},'-created_date',100));
   const ids=[...new Set(legacy.flatMap(row=>row.member_ids||[]))];
   await check();
   let migrationError;try{await Playlist.updateMany({id:playlistId,creator_id:actor.id,collaborator_ids:{$exists:false}},{$set:{collaborator_ids:ids}});}catch(e){migrationError=e;}
   if(!Array.isArray((await Playlist.get(playlistId)).collaborator_ids))throw migrationError||Error('Collaborators were not confirmed. Please retry.');
  }
  const current=await Playlist.get(playlistId),members=current.collaborator_ids;
  if(add&&members.length>=30&&!members.includes(memberId))fail('This playlist already has 30 collaborators.');
  await check();
  let failure;
  try{await Playlist.updateMany({id:playlistId,creator_id:actor.id},add?{$addToSet:{collaborator_ids:memberId}}:{$pull:{collaborator_ids:memberId}});}catch(e){failure=e;}
  await check();
  const confirmed=await Playlist.get(playlistId);
  if(!Array.isArray(confirmed.collaborator_ids)||confirmed.collaborator_ids.includes(memberId)!==add)throw failure||Error('This invitation was not saved. Please retry.');
  return {...confirmed,collaboration_enabled:true};
 })();
 locks.set(key,{add,promise});const cleanup=()=>{if(locks.get(key)?.promise===promise)locks.delete(key);};promise.then(cleanup,cleanup);return promise;
}
