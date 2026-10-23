import {createClientFromRequest} from 'npm:@base44/sdk';
const rows=value=>Array.isArray(value)?value:value?.items||[];
const fingerprint=track=>JSON.stringify([String(track.title||'').trim(),String(track.artist||'').trim(),Math.round((Number(track.duration_seconds)||0)*1000),String(track.album_name||'').trim()]);
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const clean=value=>String(value||'').replace(/\s*[\[(](?:official\s+(?:audio|video|music\s+video|lyric\s+video)|lyrics?\s+video)[\])]\s*/gi,' ').replace(/\s+/g,' ').trim();
const pending=new Map();
async function cache(client,track,sourceId){
 const svc=client.asServiceRole,key=fingerprint(track);
 const old=rows(await svc.entities.CatalogLyrics.filter({track_id:track.id,fingerprint:key},'-updated_date',1))[0];
 if(old?.synced_lyrics)return {cached:true,record_id:old.id,record:{source_id:old.source_id,synced_lyrics:old.synced_lyrics,duration_seconds:old.duration_seconds}};
 const response=await fetch('https://lrclib.net/api/get/'+sourceId,{headers:{'User-Agent':'Public/1.0 (https://publicnet.base44.app)'},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Object.assign(Error('LRCLIB verification unavailable'),{status:response.status===429?429:502});
 const row=await response.json(),duration=Number(track.duration_seconds);
 if(row.id!==sourceId||!Number.isFinite(duration)||duration<=0||normalize(row.trackName)!==normalize(clean(track.title))||normalize(row.artistName)!==normalize(track.artist)||!Number.isFinite(Number(row.duration))||Math.abs(Number(row.duration)-duration)>2)throw Object.assign(Error('Recording does not match this song'),{status:422});
 const lrc=typeof row.syncedLyrics==='string'?row.syncedLyrics:'';
 const stamps=[...lrc.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
 if(row.instrumental===true||!lrc.split('\n').some(line=>/\[\d{1,3}:\d{2}/.test(line)&&line.replace(/\[[^\]]*\]/g,'').trim())||lrc.length>100000||stamps.length<2||stamps.length>2000||!stamps.some(m=>Number(m[1])*60+Number(m[2])>0)||stamps.some(m=>Number(m[2])>=60||Number(m[1])*60+Number(m[2])>duration+2))throw Object.assign(Error('Valid synced lyrics are required'),{status:422});
 // Re-read song metadata before writing; edits made during verification invalidate the match.
 const current=await svc.entities.Track.get(track.id);
 if(!current?.is_published||current.approval_status!=='approved'||fingerprint(current)!==key)throw Object.assign(Error('Song changed; retry lyrics lookup'),{status:409});
 const existing=rows(await svc.entities.CatalogLyrics.filter({track_id:track.id,fingerprint:key},'-updated_date',1))[0];
 if(existing?.synced_lyrics)return {cached:true,record_id:existing.id,record:{source_id:existing.source_id,synced_lyrics:existing.synced_lyrics,duration_seconds:existing.duration_seconds}};
 const saved=await svc.entities.CatalogLyrics.create({track_id:track.id,fingerprint:key,source:'LRCLIB',source_id:sourceId,synced_lyrics:lrc,duration_seconds:Number(row.duration)});
 if(!saved?.id)throw Error('Shared save was not confirmed');
 return {cached:true,record_id:saved.id,record:{source_id:saved.source_id,synced_lyrics:saved.synced_lyrics,duration_seconds:saved.duration_seconds}};
}
export default async function handleRequest(req){
 try{
  if(req.method!=='POST')return Response.json({error:'Use POST'},{status:405});
  const client=createClientFromRequest(req),user=await client.auth.me();
  if(!user?.id)return Response.json({error:'Sign in to cache lyrics'},{status:401});
  if(user.disabled||user.is_blocked)return Response.json({error:'Account unavailable'},{status:403});
  const body=await req.json();
  if(typeof body.track_id!=='string'||!body.track_id||!Number.isSafeInteger(body.source_id)||body.source_id<=0)return Response.json({error:'Choose a song and LRCLIB record'},{status:422});
  const track=await client.entities.Track.get(body.track_id);
  // Public shared cache never exposes private uploads or unpublished songs.
  if(!track?.is_published||track.approval_status!=='approved')return Response.json({error:'Shared lyrics are available for published songs only'},{status:403});
  const key=track.id+':'+fingerprint(track);
  if(!pending.has(key))pending.set(key,cache(client,track,body.source_id).finally(()=>pending.delete(key)));
  return Response.json(await pending.get(key));
 }catch(error){return Response.json({error:error?.message||'Lyrics could not be cached'},{status:Number(error?.status)||500});}
}
Deno.serve(handleRequest);
