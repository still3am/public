export async function requireAdmin(client){
 const user=await client.auth.me();if(user?.role!=='admin'||user.disabled||user.is_blocked)throw Error('Administrator access required.');return user;
}
export async function readAdminRows(client,entity,query={},sort='-created_date'){
 await requireAdmin(client);const map=new Map(),limit=100;
 for(let skip=0;skip<100000;skip+=limit){
 const response=await client.entities[entity].filter(query,sort,limit,skip);
 const rows=Array.isArray(response)?response:response?.items;
 if(!Array.isArray(rows))throw Error('The admin list returned an invalid response.');
 let added=0;for(const row of rows)if(row.id&&!map.has(row.id)){map.set(row.id,row);added++;}
 if(rows.length<limit)return [...map.values()];
 if(!added)throw Error('The admin list could not finish loading.');
 }throw Error('Too many results to load.');
}
export async function moderateAdminTrack(client,id,status){
 await requireAdmin(client);if(!['approved','rejected','pending','private'].includes(status))throw Error('Invalid release status.');
 const track=await client.entities.Track.get(id);
 if(status==='approved'&&!(track.artist?.trim()&&track.genre&&track.cover_art_url&&track.rights_confirmed))throw Error('Artist, genre, artwork and confirmed rights are required.');
 const saved=await client.entities.Track.update(id,{approval_status:status,is_published:status==='approved',...(status==='approved'&&!track.published_at?{published_at:new Date().toISOString()}: {})});
 if(saved.approval_status!==status||saved.is_published!==(status==='approved'))throw Error('Release change was not confirmed.');
 if(typeof window!=='undefined')window.dispatchEvent(new Event('catalog:invalidate'));return saved;
}
export async function saveAdminReply(client,id,text){
 await requireAdmin(client);const reply=String(text||'').trim();if(!reply||reply.length>5000)throw Error('Reply must be 1–5000 characters.');
 const original=await client.entities.SupportTicket.get(id);
 const saved=await client.entities.SupportTicket.update(id,{reply,status:'answered'});
 if(saved.reply!==reply||saved.status!=='answered')throw Error('Reply was not confirmed.');
 if(original.user_id){try{
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(reply)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const source_key='support:'+id+':'+hash;const found=await client.entities.Notification.filter({user_id:original.user_id,source_key},'-created_date',1);
 if(!found.length)await client.entities.Notification.create({user_id:original.user_id,type:'support_reply',actor_id:(await client.auth.me()).id,actor_name:'PUBLIC Support',source_key,target_path:'/support?ticket='+encodeURIComponent(id),comment:'There is a new reply to your support request.',read:false});
 }catch{return {...saved,notificationPending:true};}}
 return saved;
}
export async function reviewAdminReport(client,row,remove=false,dismiss=false){
 await requireAdmin(client);
 if(remove){
 const id=row.target_id||row.track_id,type=row.target_type||'track';
 if(type==='track')await moderateAdminTrack(client,id,'rejected');
 else if(type==='moment')await client.entities.Moment.update(id,{status:'deleted',caption:'',media:[],liker_ids:[]});
 else if(type==='moment_comment')await client.entities.MomentComment.update(id,{status:'deleted',body:''});
 else {const name={comment:'ProfileComment',annotation:'TrackAnnotation',suggestion:'Suggestion',notification:'Notification',artist:'Artist'}[type];if(!name)throw Error('Use account suspension for user reports.');await client.entities[name].delete(id);}
 }
 const status=dismiss?'dismissed':'reviewed',saved=await client.entities.Report.update(row.id,{status});
 if(saved.status!==status)throw Error('Report review was not confirmed.');
}

export async function suspendAdminMember(client,id,blocked){
 const user=await requireAdmin(client);if(user.id===id)throw Error('You cannot suspend your own account.');
 await client.entities.User.update(id,{is_blocked:blocked});
 await client.entities.PublicProfile.updateMany({user_id:id},{$set:{visible:!blocked}});
 if(blocked){await client.entities.Track.updateMany({uploader_id:id},{$set:{is_published:false,approval_status:'rejected'}});await client.entities.LoungeSession.updateMany({host_id:id},{$set:{is_active:false}});}
 const confirmed=await client.entities.User.get(id);if(confirmed.is_blocked!==blocked)throw Error('Account access change was not confirmed.');
 if(typeof window!=='undefined')window.dispatchEvent(new Event('catalog:invalidate'));return confirmed;
}

export async function setAdminSuggestionStatus(client,id,status){
 const admin=await requireAdmin(client);
 if(!['open','reviewing','planned','in_progress','done'].includes(status))throw Error('Invalid suggestion status.');
 const saved=await client.entities.Suggestion.update(id,{status});
 if(saved?.status!==status)throw Error('Suggestion status was not confirmed.');
 let notificationPending=false;
 if(status==='done')for(const recipient of [...new Set([saved.user_id,...(saved.voter_ids||[])].filter(Boolean))]){
  try{
   const source_key='suggestion:'+id;
   const response=await client.entities.Notification.filter({user_id:recipient,source_key},'-created_date',1);
   const found=Array.isArray(response)?response:response?.items;if(!Array.isArray(found))throw Error('Notification lookup failed.');
   if(found.length)continue;
   const member=await client.entities.User.get(recipient);
   if(!member||member.disabled||member.is_blocked)continue;
   await client.entities.Notification.create({user_id:recipient,type:'suggestion_shipped',actor_id:admin.id,actor_name:'PUBLIC',source_key,target_path:'/suggestions?idea='+encodeURIComponent(id),comment:'Now available: '+String(saved.title||'Your supported idea').slice(0,120),read:false});
  }catch{notificationPending=true;}
 }
 return {...saved,notificationPending};
}
