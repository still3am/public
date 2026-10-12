import {createClientFromRequest} from 'npm:@base44/sdk';
export default async function(req){
 try{
  const b=createClientFromRequest(req),u=await b.auth.me();
  if(!u||u.is_blocked||u.disabled)return Response.json({error:'Account unavailable'},{status:403});
  const {track_id}=await req.json(),s=b.asServiceRole;
  const t=await b.entities.Track.get(track_id);
  if(!t)return Response.json({error:'Track unavailable'},{status:404});
  const since=new Date(Date.now()-60000).toISOString();
  const recent=await s.entities.PlayEvent.filter({user_id:u.id,track_id,created_date:{$gte:since}},'-created_date',1);
  if(recent.length)return Response.json({ok:true,counted:false});
  await s.entities.PlayEvent.create({user_id:u.id,track_id});
  await s.entities.Track.updateMany({id:track_id},{$inc:{play_count:1}});
  return Response.json({ok:true,counted:true});
 }catch(e){return Response.json({error:e.message||'Play count unavailable'},{status:500});}
}