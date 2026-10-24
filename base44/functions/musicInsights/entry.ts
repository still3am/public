import {createClientFromRequest} from "npm:@base44/sdk";
const day=86400000;
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
async function all(entity,query,fields){const rows=[],seen=new Set();let cursor;for(let page=0;page<80;page++){
 const result=await entity.filter(query,{sort:"-created_date",limit:2000,...(fields?{fields}:{}),...(cursor?{cursor}:{})});
 if(Array.isArray(result))return [...rows,...result];
 if(!Array.isArray(result?.items))fail("Analytics returned an invalid page",503);
 rows.push(...result.items);if(!result.has_more)return rows;
 if(!result.next_cursor||seen.has(result.next_cursor))fail("Analytics could not finish loading",503);
 seen.add(result.next_cursor);cursor=result.next_cursor;
}fail("Choose a shorter date range",422);}
export function rankPeriods(tracks,events,days,now=Date.now()){
 const start=now-days*day,previous=start-days*day,current=new Map(),prior=new Map(),valid=new Set(tracks.map(t=>t.id));
 for(const event of events){const date=new Date(event.created_date).getTime();if(!valid.has(event.track_id)||date>now||date<previous)continue;const map=date>=start?current:prior;map.set(event.track_id,(map.get(event.track_id)||0)+1);}
 const sorted=map=>[...map].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 const previousRanks=new Map(sorted(prior).map(([id],i)=>[id,i+1]));
 return sorted(current).map(([track_id,plays],i)=>({track_id,plays,previous_plays:prior.get(track_id)||0,position:i+1,previous_position:previousRanks.get(track_id)||null,movement:previousRanks.has(track_id)?previousRanks.get(track_id)-(i+1):null,growth:plays-(prior.get(track_id)||0)}));
}
export function summarizeArtist(tracks,events,sessions,saves){
 const valid=new Map(tracks.map(t=>[t.id,t])),listeners=new Set(),counts=new Map(),deduped=new Map();
 for(const session of sessions){if(!session.session_key)continue;const key=(session.created_by_id||"")+":"+session.session_key,old=deduped.get(key);if(!old||session.listened_seconds>old.listened_seconds)deduped.set(key,session);}
 let eligible=0,completed=0;
 for(const event of events){if(!valid.has(event.track_id))continue;if(event.user_id)listeners.add(event.user_id);counts.set(event.track_id,(counts.get(event.track_id)||0)+1);}
 for(const session of deduped.values()){
 const track=valid.get(session.track_id);if(!track||!Number.isFinite(session.listened_seconds)||session.listened_seconds<5)continue;
 if(session.created_by_id)listeners.add(session.created_by_id);
 const duration=Number(session.duration_seconds||track.duration_seconds);if(!Number.isFinite(duration)||duration<=0)continue;
 eligible++;if(session.listened_seconds>=duration*.9)completed++;
 }
 const saved=new Set(saves.filter(row=>valid.has(row.track_id)).map(row=>row.user_id+":"+row.track_id));
 return {plays:[...counts.values()].reduce((a,b)=>a+b,0),unique_listeners:listeners.size,saves:saved.size,completion_rate:eligible?Math.round(completed/eligible*100):null,measured_sessions:eligible,tracks:tracks.map(t=>({track_id:t.id,plays:counts.get(t.id)||0}))};
}
export default async function handleRequest(req){try{
 const b=createClientFromRequest(req),svc=b.asServiceRole,user=await b.auth.me().catch(()=>null),input=await req.json();
 if(user&&(user.disabled||user.is_blocked))fail("Account unavailable",403);
 if(input.action==="charts"){
 const days=input.period==="month"?30:input.period==="week"?7:0;if(!days)fail("Choose week or month");
 let tracks=await all(svc.entities.Track,{is_published:true,approval_status:"approved"},["id","uploader_id"]);
 if(user){const blocks=await all(svc.entities.Block,{$or:[{user_id:user.id},{blocked_user_id:user.id}]});const hidden=new Set(blocks.map(row=>row.user_id===user.id?row.blocked_user_id:row.user_id));tracks=tracks.filter(t=>!hidden.has(t.uploader_id));}
 const now=Date.now(),events=await all(svc.entities.PlayEvent,{created_date:{$gte:new Date(now-days*2*day).toISOString()}},["track_id","created_date"]);
 return Response.json({rows:rankPeriods(tracks,events,days,now),updated_at:new Date(now).toISOString(),days});
 }
 if(input.action!=="artist")fail("Unknown analytics request");
 if(!user)fail("Sign in required",401);if(user.creator_role!=="artist"&&user.role!=="admin")fail("Artist access required",403);
 const days={week:7,month:30,quarter:90,all:0}[input.period];if(days===undefined)fail("Invalid date range");
 const tracks=await all(svc.entities.Track,{uploader_id:user.id},["id","duration_seconds"]),ids=tracks.map(t=>t.id);
 let events=[],sessions=[],saves=[];
 const date=days?{$gte:new Date(Date.now()-days*day).toISOString(),$lte:new Date().toISOString()}:{$lte:new Date().toISOString()};
 for(let start=0;start<ids.length;start+=200){const scope={track_id:{$in:ids.slice(start,start+200)}};
 const rows=await Promise.all([all(svc.entities.PlayEvent,{...scope,created_date:date},["track_id","user_id"]),all(svc.entities.ListeningSession,{...scope,started_at:date},["track_id","session_key","created_by_id","listened_seconds","duration_seconds"]),all(svc.entities.LibraryItem,{...scope,created_date:date},["user_id","track_id"])]);
 events.push(...rows[0]);sessions.push(...rows[1]);saves.push(...rows[2]);}
 return Response.json({metrics:summarizeArtist(tracks,events,sessions,saves),period:input.period});
 }catch(error){return Response.json({error:error.message||"Analytics unavailable"},{status:error.status||500});}}
if(typeof Deno!=="undefined")Deno.serve(handleRequest);
