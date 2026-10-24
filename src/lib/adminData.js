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
 const saved=await client.entities.SupportTicket.update(id,{reply,status:'answered'});
 if(saved.reply!==reply||saved.status!=='answered')throw Error('Reply was not confirmed.');return saved;
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
