import { createClientFromRequest } from 'npm:@base44/sdk';
export default async function(req) {
 try {
  const b=createClientFromRequest(req),u=await b.auth.me();
  if(!u) return Response.json({error:'Sign in required'},{status:401});
  const s=b.asServiceRole,id=u.id;
  // Fail closed: any cleanup failure keeps the account available for retry.
  const queries={
   Track:{uploader_id:id},Lyrics:{uploader_id:id},Album:{creator_id:id},
   LibraryItem:{user_id:id},SavedPlaylist:{user_id:id},Playlist:{creator_id:id},Like:{user_id:id},
   UserGenre:{user_id:id},OfflineSync:{user_id:id},PlaybackState:{user_id:id},
   ProfileComment:{$or:[{author_id:id},{profile_id:id}]},TrackAnnotation:{author_id:id},
   Suggestion:{user_id:id},Follow:{$or:[{follower_id:id},{following_id:id}]},
   Notification:{$or:[{user_id:id},{actor_id:id}]},Report:{reporter_id:id},
   Message:{$or:[{sender_id:id},{recipient_id:id}]},Conversation:{participant_ids:{$in:[id]}},
   LoungeMember:{user_id:id},LoungeQueueItem:{added_by_id:id},
   Block:{$or:[{user_id:id},{blocked_user_id:id}]},SupportTicket:{user_id:id}
  };
  const tracks=await s.entities.Track.filter({uploader_id:id},{limit:500});
  // Remove contributed content and profile snapshots before the identity.
  for(const [name,q] of Object.entries(queries)) await s.entities[name].deleteMany(q);
  const sessions=await s.entities.LoungeSession.filter({host_id:id},{limit:1000});
  for(const r of sessions.items||sessions||[]) {
   await s.entities.LoungeMember.deleteMany({session_id:r.id});
   await s.entities.LoungeQueueItem.deleteMany({session_id:r.id});
  }
  await s.entities.LoungeSession.deleteMany({host_id:id});
  for(const t of tracks.items||tracks||[]) {
   await s.entities.Playlist.updateMany({track_ids:{$in:[t.id]}},{$pull:{track_ids:t.id}});
   for(const name of ['LibraryItem','Lyrics','Like','TrackAnnotation']) await s.entities[name].deleteMany({track_id:t.id});
  }
  // No anonymization fallback: never claim completion while identity survives.
  await s.entities.User.delete(id);
  return Response.json({success:true,deleted:true});
 } catch(e) {
  return Response.json({error:'Deletion did not complete. Your account remains available for another attempt. '+(e.message||'')},{status:500});
 }
}