import { createClientFromRequest } from 'npm:@base44/sdk';
const err=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('');
export default async function(req) {
 try {
  const b=createClientFromRequest(req),s=b.asServiceRole,u=await b.auth.me().catch(()=>null),d=await req.json();
  const requireUser=()=>{if(!u)err('Sign in required',401);if(u.is_blocked||u.disabled)err('Account suspended',403);};
  const admin=()=>{requireUser();if(u.role!=='admin')err('Admin only',403);};
  if(d.action==='contact') {
   const subject=String(d.subject||'').trim(),message=String(d.message||'').trim(),email=String(d.email||'').trim();
   if(subject.length<3||subject.length>160||message.length<10||message.length>5000)err('Enter a subject and a message of 10–5000 characters');
   if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))err('Check your email address');
   const token=crypto.randomUUID()+crypto.randomUUID();
   const ticket=await s.entities.SupportTicket.create({user_id:u?.id||'',email,subject,message,access_hash:await hash(token),status:'open',reply:''});
   return Response.json({id:ticket.id,token,status:'open'});
  }
  if(d.action==='ticket') {
   if(typeof d.id!=='string'||typeof d.token!=='string')err('Ticket reference required');
   const t=await s.entities.SupportTicket.get(d.id);
   if(t.access_hash!==await hash(d.token))err('Ticket access denied',403);
   return Response.json({ticket:{id:t.id,subject:t.subject,message:t.message,status:t.status,reply:t.reply,created_date:t.created_date}});
  }
  if(d.action==='reply') {
   admin();const reply=String(d.reply||'').trim();
   if(!reply||reply.length>5000)err('Reply must be 1–5000 characters');
   await s.entities.SupportTicket.update(d.id,{reply,status:'answered'});
   return Response.json({success:true});
  }
  requireUser();
  if(d.action==='blocked') {
   const rows=await s.entities.Block.filter({$or:[{user_id:u.id},{blocked_user_id:u.id}]},'-created_date',1000);
   return Response.json({ids:[...new Set(rows.map(r=>r.user_id===u.id?r.blocked_user_id:r.user_id))],own:rows.filter(r=>r.user_id===u.id)});
  }
  if(d.action==='block') {
   if(!d.user_id||d.user_id===u.id)err('Choose another user');
   await s.entities.User.get(d.user_id);
   const q={user_id:u.id,blocked_user_id:d.user_id},rows=await s.entities.Block.filter(q,'-created_date',10);
   if(d.blocked===false) await s.entities.Block.deleteMany(q);
   else if(!rows.length) {
    await s.entities.Block.create(q);
    await s.entities.Follow.deleteMany({$or:[{follower_id:u.id,following_id:d.user_id},{follower_id:d.user_id,following_id:u.id}]});
   }
   return Response.json({blocked:d.blocked!==false});
  }
  if(d.action==='report') {
   const map={track:'Track',user:'User',comment:'ProfileComment',annotation:'TrackAnnotation',suggestion:'Suggestion',notification:'Notification',artist:'Artist'};
   if(!map[d.target_type]||!d.target_id)err('Choose content to report');
   const reason=String(d.reason||'').trim();
   if(reason.length<3||reason.length>2000)err('Explain the issue in 3–2000 characters');
   const record=await b.entities[map[d.target_type]].get(d.target_id);
   if(!record)err('Content unavailable',404);
   const recent=await s.entities.Report.filter({reporter_id:u.id,created_date:{$gte:new Date(Date.now()-60000).toISOString()}},'-created_date',10);
   if(recent.length>=5)err('Please wait a minute before reporting again',429);
   await s.entities.Report.create({reporter_id:u.id,target_type:d.target_type,target_id:d.target_id,...(d.target_type==='track'?{track_id:d.target_id}:{}),reason,status:'pending'});
   return Response.json({success:true});
  }
  if(d.action==='moderate') {
   admin();const r=await s.entities.Report.get(d.id);
   if(d.remove) {
    const map={track:'Track',comment:'ProfileComment',annotation:'TrackAnnotation',suggestion:'Suggestion',notification:'Notification',artist:'Artist'};
    const name=map[r.target_type||'track'],id=r.target_id||r.track_id;
    if(name==='Track')await s.entities.Track.update(id,{is_published:false,approval_status:'rejected'});
    else if(name)await s.entities[name].delete(id);
    else err('Use account suspension for user reports');
   }
   await s.entities.Report.update(d.id,{status:d.dismiss?'dismissed':'reviewed',admin_notes:String(d.notes||'').slice(0,2000)});
   return Response.json({success:true});
  }
  if(d.action==='suspend') {
   admin();if(d.user_id===u.id)err('You cannot suspend your own account');
   await s.entities.User.update(d.user_id,{is_blocked:d.blocked!==false});
   if(d.blocked!==false) {
    await s.entities.Track.updateMany({uploader_id:d.user_id},{$set:{is_published:false,approval_status:'rejected'}});
    await s.entities.LoungeSession.updateMany({host_id:d.user_id},{$set:{is_active:false}});
   }
   return Response.json({success:true});
  }
  err('Unknown action');
 } catch(e) {return Response.json({error:e.message||'Request failed'},{status:e.status||500});}
}