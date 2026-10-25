import {createClientFromRequest} from 'npm:@base44/sdk';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const rows=value=>{const list=Array.isArray(value)?value:value?.items;if(!Array.isArray(list))fail('Music requests could not load. Please retry.',503);return list;};
export const normalizeMusic=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const artistIdentity=value=>String(value||'').split(/\s*(?:,|&|;)\s*|\s+(?:feat\.?|ft\.?|featuring|with|and)\s+/i).map(normalizeMusic).filter(Boolean).sort().join('|');
export const recordingIdentity=(title,artist)=>normalizeMusic(title)+'::'+artistIdentity(artist);
const creators=user=>user?.role==='admin'||['artist','uploader'].includes(user?.creator_role);
const text=(value,label,max)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\r\n\x00-\x1f]/.test(value))fail('Enter a valid '+label+'.',422);return value.trim();};
export function sourceLink(value){
 if(!value)return '';if(typeof value!=='string'||value.length>2048)fail('Use an Apple Music or Spotify song link.',422);
 let url;try{url=new URL(value);}catch{fail('Use a complete https song link.',422);}
 const allowed=['music.apple.com','open.spotify.com','music.youtube.com','youtube.com','www.youtube.com','soundcloud.com','www.soundcloud.com','www.deezer.com','deezer.com','tidal.com','listen.tidal.com','music.amazon.com'];
 if(url.protocol!=='https:'||url.username||url.password||url.port||!allowed.includes(url.hostname))fail('Use a song link from Apple Music, Spotify, YouTube Music, SoundCloud, Deezer, Tidal, or Amazon Music.',422);
 url.hash='';for(const key of [...url.searchParams.keys()])if(!['i','v','list'].includes(key))url.searchParams.delete(key);return url.href;
}
function artworkLink(value){if(!value)return '';if(typeof value!=='string'||value.length>2048)fail('Use a valid cover image link.',422);let url;try{url=new URL(value);}catch{fail('Use a valid cover image link.',422);}if(url.protocol!=='https:'||url.username||url.password||url.port||!(url.hostname==='i.scdn.co'||url.hostname==='mosaic.scdn.co'||url.hostname.endsWith('.mzstatic.com')))fail('Use an Apple Music or Spotify cover image link.',422);return url.href;}
async function keyFor(title,artist){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(recordingIdentity(title,artist)));return Array.from(new Uint8Array(bytes)).map(n=>n.toString(16).padStart(2,'0')).join('');}
async function all(entity,query={},fields){const result=new Map();for(let skip=0;skip<50000;skip+=500){const page=rows(await entity.filter(query,'created_date',500,skip,fields));let added=0;for(const row of page)if(row?.id&&!result.has(row.id)){result.set(row.id,row);added++;}if(page.length<500)return [...result.values()];if(!added)fail('Music requests could not finish loading. Please retry.',503);}fail('Too many requests to load. Please contact support.',503);}
function grouped(records){const map=new Map();for(const row of records){if(!row?.request_key)continue;const old=map.get(row.request_key);if(!old)map.set(row.request_key,{...row,supporter_ids:[...new Set(row.supporter_ids||[])]});else{old.supporter_ids=[...new Set([...old.supporter_ids,...(row.supporter_ids||[])])];if(row.status==='available'&&row.available_track_id){old.status='available';old.available_track_id=row.available_track_id;}else if(row.status==='closed'&&old.status==='open')old.status='closed';}}return [...map.values()];}
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
async function canHear(svc,uid,track){if(!track?.id||!track.is_published||track.approval_status!=='approved')return false;const uploader=await svc.entities.User.get(track.uploader_id).catch(error=>{if((error.status??error.response?.status)===404)return null;throw error;});if(!uploader||uploader.is_blocked||uploader.disabled)return false;const found=rows(await svc.entities.Block.filter({$or:[{user_id:uid,blocked_user_id:track.uploader_id},{user_id:track.uploader_id,blocked_user_id:uid}]},'id',1));return !found.length;}
async function canonical(svc,key){if(typeof key!=='string'||!/^[0-9a-f]{64}$/.test(key))fail('Choose a valid music request.',422);const found=grouped(await all(svc.entities.MusicRequest,{request_key:key}));if(!found.length)fail('This music request is no longer available.',404);return found[0];}
async function notify(svc,request,track,actor){let pending=false;for(const uid of request.supporter_ids||[]){try{const member=await svc.entities.User.get(uid);if(!member||member.is_blocked||member.disabled||!await canHear(svc,uid,track))continue;if(uid!==actor.id&&rows(await svc.entities.Block.filter({$or:[{user_id:uid,blocked_user_id:actor.id},{user_id:actor.id,blocked_user_id:uid}]},'id',1)).length)continue;const source_key='music-request:'+request.request_key+':'+track.id;const exists=rows(await svc.entities.Notification.filter({user_id:uid,source_key},'id',1));if(!exists.length){const saved=await svc.entities.Notification.create({user_id:uid,type:'music_request_available',actor_id:actor.id,actor_name:'PUBLIC',track_id:track.id,target_path:'/track/'+encodeURIComponent(track.id),source_key,comment:'Now on PUBLIC: '+request.title+' — '+request.artist,read:false});if(!saved?.id)throw Error('Notification was not confirmed.');}}catch(error){if((error.status??error.response?.status)!==404)pending=true;}}return pending;}
async function fulfill(svc,request,track,actor){if(!await canHear(svc,actor.id,track)||recordingIdentity(track.title,track.artist)!==recordingIdentity(request.title,request.artist))fail('Choose the matching, approved recording on PUBLIC.',422);await svc.entities.MusicRequest.updateMany({request_key:request.request_key},{$set:{status:'available',available_track_id:track.id,resolved_by:actor.id}});const confirmed=await canonical(svc,request.request_key);if(confirmed.status!=='available'||confirmed.available_track_id!==track.id)fail('The song link was not confirmed. Please retry.',503);return {request:confirmed,notification_pending:await notify(svc,confirmed,track,actor)};}
const locks=new Map();
async function serialized(key,fn){const previous=locks.get(key)||Promise.resolve();const job=previous.catch(()=>{}).then(fn);locks.set(key,job);try{return await job;}finally{if(locks.get(key)===job)locks.delete(key);}}
export default async function handleRequest(req){
 try{
  const client=createClientFromRequest(req),caller=await client.auth.me().catch(()=>null);if(!caller?.id)fail('Sign in to use Music Requests.',401);
  const svc=client.asServiceRole,user=await svc.entities.User.get(caller.id);if(!user?.id||user.is_blocked||user.disabled)fail('Your account is unavailable.',403);
  const body=await req.json().catch(()=>({})),action=body.action;
  if(action==='list'){
   const requests=grouped(await all(svc.entities.MusicRequest)),trackIds=[...new Set(requests.map(r=>r.available_track_id).filter(Boolean))],tracks=new Map();
   for(let i=0;i<trackIds.length;i+=100)for(const track of await all(svc.entities.Track,{id:{$in:trackIds.slice(i,i+100)},is_published:true,approval_status:'approved'},['id','title','artist','uploader_id','is_published','approval_status']))tracks.set(track.id,track);
   const result=[];for(const r of requests){if(r.status==='closed'&&user.role!=='admin')continue;let available=false;const track=tracks.get(r.available_track_id);if(track&&recordingIdentity(track.title,track.artist)===recordingIdentity(r.title,r.artist))available=await canHear(svc,user.id,track);result.push({id:r.id,request_key:r.request_key,title:r.title,artist:r.artist,source_url:r.source_url||'',artwork_url:r.artwork_url||'',created_date:r.created_date,status:r.status==='closed'?'closed':available?'available':'open',available_track_id:available?r.available_track_id:'',support_count:r.supporter_ids.length,supported:r.supporter_ids.includes(user.id),mine:r.requester_id===user.id});}
   return Response.json({requests:result,can_manage:creators(user),is_admin:user.role==='admin'});
  }
  if(action==='create'){
   const title=text(body.title,'song title',200),artist=text(body.artist,'artist',200);if(!normalizeMusic(title)||!normalizeMusic(artist))fail('Enter a song title and artist.',422);
   const source_url=sourceLink(body.source_url),artwork_url=artworkLink(body.artwork_url),key=await keyFor(title,artist);
   return await serialized(key,async()=>{
    let found=grouped(await all(svc.entities.MusicRequest,{request_key:key}));
    if(!found.length){const recent=rows(await svc.entities.MusicRequest.filter({requester_id:user.id,created_date:{$gte:new Date(Date.now()-86400000).toISOString()}},'-created_date',10));if(recent.length>=10)fail('You can request up to 10 new songs per day. You can still support existing requests.',429);const saved=await svc.entities.MusicRequest.create({request_key:key,title,artist,source_url,artwork_url,requester_id:user.id,supporter_ids:[user.id],status:'open',available_track_id:''});if(!saved?.id)fail('Your request was not confirmed. Please retry.',503);}
    else if(found[0].status==='closed')fail('This request is closed. Please contact support if it needs another review.',409);
    await svc.entities.MusicRequest.updateMany({request_key:key},{$addToSet:{supporter_ids:user.id}});
    const confirmed=await canonical(svc,key);if(!confirmed.supporter_ids.includes(user.id))fail('Your request was not confirmed. Please retry.',503);
    return Response.json({success:true,id:confirmed.id,request_key:key,combined:found.length>0});
   });
  }
  if(action==='support'){
   if(typeof body.request_key!=='string'||!/^[0-9a-f]{64}$/.test(body.request_key)||typeof body.support!=='boolean')fail('Choose a valid music request.');
   return await serialized(body.request_key,async()=>{const request=await canonical(svc,body.request_key);if(request.status==='closed')fail('This request is closed.',409);await svc.entities.MusicRequest.updateMany({request_key:request.request_key},body.support?{$addToSet:{supporter_ids:user.id}}:{$pull:{supporter_ids:user.id}});const confirmed=await canonical(svc,request.request_key);if(confirmed.supporter_ids.includes(user.id)!==body.support)fail('Support was not saved. Please retry.',503);return Response.json({success:true,supported:body.support,support_count:confirmed.supporter_ids.length});});
  }
  if(action==='fulfill'){
   if(!creators(user))fail('Approved creator access is required.',403);
   if(typeof body.track_id!=='string'||typeof body.request_key!=='string')fail('Choose a request and song.');
   return await serialized(body.request_key,async()=>{const request=await canonical(svc,body.request_key);if(request.status==='closed')fail('This request is closed.',409);const track=await svc.entities.Track.get(body.track_id);const result=await fulfill(svc,request,track,user);return Response.json({success:true,notification_pending:result.notification_pending});});
  }
  if(action==='close'||action==='reopen'){
   if(user.role!=='admin')fail('Administrator access required.',403);const request=await canonical(svc,body.request_key),status=action==='close'?'closed':'open';await svc.entities.MusicRequest.updateMany({request_key:request.request_key},{$set:{status,available_track_id:'',resolved_by:user.id}});if((await canonical(svc,request.request_key)).status!==status)fail('Status was not confirmed.',503);return Response.json({success:true});
  }
  if(action==='reconcile'){
   if(!creators(user))fail('Approved creator access is required.',403);
   const requests=grouped(await all(svc.entities.MusicRequest,{status:'open'}));let matched=0,pending=false;
   for(let i=0;i<requests.length;i+=40){
    const batch=requests.slice(i,i+40),tracks=await all(svc.entities.Track,{is_published:true,approval_status:'approved',$or:batch.map(r=>({title:{$regex:'^'+normalizeMusic(r.title).split(' ').map(escape).join('[\\W_]+')+'$',$options:'i'}}))},['id','title','artist','uploader_id','duration_seconds','explicit','is_published','approval_status']);
    for(const request of batch){const candidates=tracks.filter(t=>recordingIdentity(t.title,t.artist)===recordingIdentity(request.title,request.artist));if(!candidates.length)continue;
     // Ambiguous lengths or clean/explicit editions require creator review.
     if(candidates.length>1&&(new Set(candidates.map(t=>!!t.explicit)).size>1||Math.max(...candidates.map(t=>t.duration_seconds||0))-Math.min(...candidates.map(t=>t.duration_seconds||0))>3))continue;
     try{await serialized(request.request_key,async()=>{const fresh=await canonical(svc,request.request_key);if(fresh.status!=='open')return;const result=await fulfill(svc,fresh,candidates[0],user);pending=pending||result.notification_pending;matched++;});}catch(error){if(![403,404,422].includes(error.status??error.response?.status))throw error;}
    }
   }
   return Response.json({success:true,matched,notification_pending:pending});
  }
  fail('Unknown music request action.');
 }catch(error){return Response.json({error:error?.message||'Music Requests is unavailable. Please retry.'},{status:error?.status||500});}
}
if(typeof Deno!=='undefined')Deno.serve(handleRequest);
