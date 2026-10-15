import {createClientFromRequest} from 'npm:@base44/sdk';

// Cleanup is ordered so a failed attempt can be retried: parent records survive
// until all of their references have been removed. Identity is always last.
export async function deleteAccountData(b,u){
 const s=b.asServiceRole,id=u.id;
 const rows=r=>Array.isArray(r)?r:r?.items||[];
 const collect=async(client,name,query)=>{
  const out=[];let cursor;
  for(let page=0;page<100;page++){
   const result=await client.entities[name].filter(query,{limit:500,sort:'id',...(cursor?{cursor}:{})});
   out.push(...rows(result));
   if(Array.isArray(result)||!result?.has_more)return out;
   if(!result.next_cursor||result.next_cursor===cursor)throw Error('Cleanup pagination stalled');
   cursor=result.next_cursor;
  }
  throw Error('Cleanup limit reached');
 };
 const erase=async(client,name,query)=>{
  for(let page=0;page<200;page++){
   const result=await client.entities[name].deleteMany(query);
   if(result?.success===false)throw Error('Cleanup was not confirmed');
   if(!result?.has_more&&!(result?.deleted>=500))return;
  }
  throw Error('Cleanup limit reached');
 };
 const [tracks,playlists,sessions]=await Promise.all([
  collect(s,'Track',{uploader_id:id}),collect(s,'Playlist',{creator_id:id}),collect(s,'LoungeSession',{host_id:id})
 ]);
 const trackIds=tracks.map(t=>t.id);
 // Clean references while uploaded tracks, playlists and sessions still exist.
 for(let offset=0;offset<trackIds.length;offset+=100){
  const ids=trackIds.slice(offset,offset+100),q={track_id:{$in:ids}};
  for(const name of ['PlayEvent','LibraryItem','Like','Lyrics','TrackAnnotation','LoungeQueueItem','Notification'])await erase(s,name,q);
  await s.entities.Playlist.updateMany({track_ids:{$in:ids}},{$pull:{track_ids:{$in:ids}}});
  await s.entities.PublicProfile.updateMany({featured_track_id:{$in:ids}},{$set:{featured_track_id:''}});
  await s.entities.PublicProfile.updateMany({top_track_ids:{$in:ids}},{$pull:{top_track_ids:{$in:ids}}});
  const affected=await collect(s,'User',{$or:[{featured_track_id:{$in:ids}},{top_track_ids:{$in:ids}},{offline_track_ids:{$in:ids}}]});
  const removed=new Set(ids);
  for(const member of affected){
   const data={};
   if(removed.has(member.featured_track_id))data.featured_track_id='';
   if(Array.isArray(member.top_track_ids))data.top_track_ids=member.top_track_ids.filter(tid=>!removed.has(tid));
   if(Array.isArray(member.offline_track_ids))data.offline_track_ids=member.offline_track_ids.filter(tid=>!removed.has(tid));
   if(Object.keys(data).length)await s.entities.User.update(member.id,data);
  }
 }
 for(const playlist of playlists)await erase(s,'SavedPlaylist',{playlist_id:playlist.id});
 for(const room of sessions){
  await erase(s,'LoungeMember',{session_id:room.id});
  await erase(s,'LoungeQueueItem',{session_id:room.id});
 }
 // Owner-only collections use the caller's authenticated context, not a service identity.
 for(const name of ['LibraryItem','SavedPlaylist','UserGenre','OfflineSync','PlaybackState'])await erase(b,name,{user_id:id});
 const queries={
  PlayEvent:{user_id:id},Lyrics:{uploader_id:id},Like:{user_id:id},
  ProfileComment:{$or:[{author_id:id},{profile_id:id}]},TrackAnnotation:{author_id:id},
  Suggestion:{user_id:id},Follow:{$or:[{follower_id:id},{following_id:id}]},
  Notification:{$or:[{user_id:id},{actor_id:id}]},Report:{reporter_id:id},
  Message:{$or:[{sender_id:id},{recipient_id:id}]},Conversation:{participant_ids:{$in:[id]}},
  LoungeMember:{user_id:id},LoungeQueueItem:{added_by_id:id},
  Block:{$or:[{user_id:id},{blocked_user_id:id}]},SupportTicket:{user_id:id}
 };
 for(const [name,query] of Object.entries(queries))await erase(s,name,query);
 // These are deleted only after reference cleanup, so retries retain their IDs.
 await erase(s,'LoungeSession',{host_id:id});
 await erase(s,'Playlist',{creator_id:id});
 await erase(s,'Track',{uploader_id:id});
 await erase(s,'Album',{creator_id:id});
 await erase(s,'PublicProfile',{user_id:id});
 const result=await s.entities.User.delete(id);
 if(result?.success===false)throw Error('Account removal was not confirmed');
}
export default async function handleRequest(req){
 try{
  const b=createClientFromRequest(req),u=await b.auth.me();
  if(!u)return Response.json({error:'Sign in required'},{status:401});
  const body=await req.json().catch(()=>({}));
  if(body.confirmation!=='DELETE')return Response.json({error:'Type DELETE to confirm account deletion.'},{status:422});
  if(body.user_id&&body.user_id!==u.id)return Response.json({error:'You can only delete your own account.'},{status:403});
  await deleteAccountData(b,u);
  return Response.json({success:true,deleted:true});
 }catch(error){
  console.error('Account deletion did not finish:',error?.message||'Unknown error');
  return Response.json({error:'Account deletion did not finish. Retry to complete it, or contact support if it keeps failing.'},{status:500});
 }
}
if(typeof Deno!=="undefined")Deno.serve(handleRequest);
