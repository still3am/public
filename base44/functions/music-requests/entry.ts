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

export function playlistSource(value){
 const clean=sourceLink(value);if(!clean)fail('Use a public Apple Music playlist link.',422);const url=new URL(clean);
 const id=url.pathname.match(/\/playlist\/(?:[^/]+\/)?(pl\.[a-zA-Z0-9-]+)\/?$/)?.[1];
 if(url.hostname!=='music.apple.com'||!id)fail('Use a public Apple Music playlist link.',422);
 return {url:url.href,id};
}
export function parseApplePlaylist(html){
 const raw=html.match(/<script[^>]+id=["']serialized-server-data["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
 if(!raw)fail('Apple Music did not expose this playlist. Make sure the playlist is public.',422);
 let data;try{data=JSON.parse(raw);}catch{fail('Apple Music could not read this playlist. Please retry.',502);}
 let header;const tracks=[],seen=new Set();let visited=0;
 function walk(value){
  if(++visited>100000)fail('This playlist is too large to preview.',422);
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){for(const item of value)walk(item);return;}
  if(typeof value.id==='string'&&value.id.startsWith('playlist-detail-header'))header=value;
  if(typeof value.id==='string'&&value.id.startsWith('track-lockup')&&value.contentDescriptor?.kind==='song'&&!seen.has(value.id)){
   seen.add(value.id);const title=value.title,artist=value.artistName;
   if(typeof title==='string'&&typeof artist==='string'&&normalizeMusic(title)&&normalizeMusic(artist))tracks.push({title:text(title,'song title',200),artist:text(artist,'artist',200),source_url:sourceLink(value.contentDescriptor.url)});
  }
  for(const item of Object.values(value))walk(item);
 }
 walk(data);
 if(!header||!tracks.length||tracks.length>500)fail('No public song list was found. Private or very large playlists are not supported yet.',422);
 const title=text(header.title,'playlist name',200),artist=String(header.subtitleLinks?.[0]?.title||'Apple Music').slice(0,200);
 const rawArt=header.artwork?.dictionary?.url||'';let artwork_url='';try{artwork_url=artworkLink(rawArt.replaceAll('{w}','300').replaceAll('{h}','300').replaceAll('{f}','jpg'));}catch{}
 const total=Number.isInteger(header.trackCount)&&header.trackCount>0?header.trackCount:0;
 return {title,artist,artwork_url,playlist_tracks:tracks,playlist_total:total,playlist_complete:total===tracks.length};
}
const playlistCache=new Map();
async function previewPlaylist(value){
 const source=playlistSource(value),cached=playlistCache.get(source.id);if(cached&&Date.now()-cached.at<300000)return {...cached.data,source_url:source.url};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(source.url,{redirect:'error',signal:controller.signal,headers:{Accept:'text/html','User-Agent':'PUBLIC-MusicRequests/1.0'}});
  if(!response.ok||!response.body)fail('Apple Music could not open this public playlist. Please try again.',502);
  const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,html='';
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>3000000)fail('This playlist is too large to preview.',422);html+=decoder.decode(part.value,{stream:true});}html+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
  const data=parseApplePlaylist(html);if(playlistCache.size>=50)playlistCache.delete(playlistCache.keys().next().value);playlistCache.set(source.id,{at:Date.now(),data});return {...data,source_url:source.url};
 }catch(error){if(error.status)throw error;fail('The public playlist could not load. Please retry or check its sharing settings.',502);}finally{clearTimeout(timer);}
}
export function spotifySongSource(value){
 const clean=sourceLink(value);if(!clean)fail('Paste a Spotify song link.',422);const url=new URL(clean);
 const id=url.pathname.match(/^\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]{22})\/?$/)?.[1];
 if(url.hostname!=='open.spotify.com'||!id)fail('Use an open.spotify.com/track/… song link.',422);
 return {id,url:'https://open.spotify.com/track/'+id};
}
const spotifyCache=new Map(),spotifyLookups=[];
async function previewSpotifySong(value){
 const source=spotifySongSource(value),cached=spotifyCache.get(source.id);if(cached&&Date.now()-cached.at<300000)return {...cached.data,source_url:source.url};
 const now=Date.now();while(spotifyLookups.length&&spotifyLookups[0]<now-60000)spotifyLookups.shift();if(spotifyLookups.length>=20)fail('Spotify previews are busy. Enter the song title and artist instead.',429);spotifyLookups.push(now);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch('https://open.spotify.com/oembed?url='+encodeURIComponent(source.url),{redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok||!response.body)fail('Spotify could not preview this song. You can still enter its title and artist.',502);
  const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,raw='';
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>100000)fail('Spotify preview could not load. Enter the title and artist instead.',502);raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
  let data;try{data=JSON.parse(raw);}catch{fail('Spotify preview could not load. Enter the title and artist instead.',502);}
  if(data?.provider_name!=='Spotify'||typeof data.title!=='string'||!normalizeMusic(data.title))fail('Spotify did not return song details. Enter the title and artist instead.',502);
  const title=text(data.title,'song title',200);let artwork_url='';try{artwork_url=artworkLink(data.thumbnail_url||'');}catch{}
  // oEmbed does not provide track artist credits. The listener confirms them.
  const result={title,artist:'',artwork_url,needs_artist:true,provider:'Spotify'};
  if(spotifyCache.size>=50)spotifyCache.delete(spotifyCache.keys().next().value);spotifyCache.set(source.id,{at:Date.now(),data:result});return {...result,source_url:source.url};
 }catch(error){if(error.status)throw error;fail('Spotify preview could not load. Enter the title and artist instead.',502);}finally{clearTimeout(timer);}
}
async function notifyUploaders(svc,request,actor){
 const spotify_url=request.spotify_url;if(!spotify_url||request.status!=='open')return {pending:false,count:0};
 const recipients=await all(svc.entities.User,{$or:[{role:'admin'},{creator_role:{$in:['uploader','artist']}}]},['id','role','creator_role','is_blocked','disabled']);let pending=false,count=0;
 for(const member of recipients){
  if(!member?.id||member.id===actor.id||member.is_blocked||member.disabled||!creators(member))continue;
  try{
   if(rows(await svc.entities.Block.filter({$or:[{user_id:actor.id,blocked_user_id:member.id},{user_id:member.id,blocked_user_id:actor.id}]},'id',1)).length)continue;
   const source_key='music-request-new:'+request.request_key;
   if(rows(await svc.entities.Notification.filter({user_id:member.id,source_key},'id',1)).length)continue;
   const saved=await svc.entities.Notification.create({user_id:member.id,type:'music_request_new',actor_id:actor.id,actor_name:'PUBLIC',target_path:'/music-requests?request='+request.request_key,source_key,comment:request.title+' — '+request.artist,read:false});
   if(!saved?.id)throw Error('Uploader notification was not confirmed.');count++;
  }catch(error){if((error.status??error.response?.status)!==404)pending=true;}
 }
 return {pending,count};
}
const songCache=new Map(),songRequests=[];
export function appleSongSource(value){
 const clean=sourceLink(value);if(!clean)fail('Paste an Apple Music song link, or enter the song details.',422);
 const url=new URL(clean);if(url.hostname!=='music.apple.com')fail('Automatic song details currently support Apple Music links. You can enter other songs manually.',422);
 const id=url.searchParams.get('i')||(/\/song\//.test(url.pathname)?url.pathname.match(/\/(\d+)\/?$/)?.[1]:null);
 if(!id||!/^\d{1,20}$/.test(id))fail('Paste a song link rather than an album or artist link.',422);
 const country=url.pathname.split('/')[1];return {url:clean,id,country:/^[a-z]{2}$/.test(country)?country:'us'};
}
async function previewSong(value){
 const source=appleSongSource(value),key=source.country+':'+source.id,cached=songCache.get(key);if(cached&&Date.now()-cached.at<300000)return {...cached.data,source_url:source.url};
 const now=Date.now();while(songRequests.length&&songRequests[0]<now-60000)songRequests.shift();if(songRequests.length>=18)fail('Automatic song lookup is busy. Try again shortly or enter the title and artist.',429);songRequests.push(now);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch('https://itunes.apple.com/lookup?id='+source.id+'&entity=song&country='+source.country,{redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok||!response.body)fail('Song details could not load. Try again or enter the title and artist.',502);
  const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,raw='';
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>500000)fail('Song details could not load. Enter the title and artist instead.',502);raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
  let data;try{data=JSON.parse(raw);}catch{fail('Song details could not load. Enter the title and artist instead.',502);}
  const track=Array.isArray(data?.results)?data.results.find(t=>t.kind==='song'&&String(t.trackId)===source.id):null;
  if(!track)fail('This song was not found in Apple’s lookup catalog. Enter its title and artist instead.',422);
  const title=text(track.trackName,'song title',200),artist=text(track.artistName,'artist',200);let artwork_url='';try{artwork_url=artworkLink(track.artworkUrl100||'');}catch{}
  const result={title,artist,artwork_url};if(songCache.size>=50)songCache.delete(songCache.keys().next().value);songCache.set(key,{at:Date.now(),data:result});return {...result,source_url:source.url};
 }catch(error){if(error.status)throw error;fail('Song details could not load. Try again or enter the title and artist.',502);}finally{clearTimeout(timer);}
}
async function playlistProgress(svc,request,uid){
 const items=request.playlist_tracks||[],tracks=[];
 for(let i=0;i<items.length;i+=40){const batch=items.slice(i,i+40);if(batch.length)tracks.push(...await all(svc.entities.Track,{is_published:true,approval_status:'approved',$or:batch.flatMap(r=>[r.title.trim().split(/\s+/).map(escape).join('\\s+'),normalizeMusic(r.title).split(' ').map(escape).join('[\\W_]+')].map(pattern=>({title:{$regex:'^'+pattern+'$',$options:'i'}})))},['id','title','artist','uploader_id','duration_seconds','explicit','is_published','approval_status']));}
 const access=new Map(),result=[];
 for(const item of items){const candidates=tracks.filter(t=>recordingIdentity(t.title,t.artist)===recordingIdentity(item.title,item.artist));let id='';const ambiguous=candidates.length>1&&(new Set(candidates.map(t=>!!t.explicit)).size>1||Math.max(...candidates.map(t=>t.duration_seconds||0))-Math.min(...candidates.map(t=>t.duration_seconds||0))>3);
  if(!ambiguous)for(const candidate of candidates){if(!access.has(candidate.id))access.set(candidate.id,await canHear(svc,uid,candidate));if(access.get(candidate.id)){id=candidate.id;break;}}
  result.push({title:item.title,artist:item.artist,source_url:item.source_url||'',available_track_id:id});
 }
 const available=result.filter(t=>t.available_track_id).length;
 return {playlist_tracks:result,playlist_available:available,playlist_total:request.playlist_total||0,playlist_complete:!!request.playlist_complete,available:!!request.playlist_complete&&result.length>0&&available===result.length};
}
async function notifyPlaylist(svc,request,actor){
 let pending=false;
 const snapshot=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify((request.playlist_tracks||[]).map(t=>recordingIdentity(t.title,t.artist)))));
 const source_key='music-request:'+request.request_key+':playlist:'+Array.from(new Uint8Array(snapshot)).map(n=>n.toString(16).padStart(2,'0')).join('');
 for(const uid of request.supporter_ids||[]){
  try{
   if(rows(await svc.entities.Notification.filter({user_id:uid,source_key},'id',1)).length)continue;
   const member=await svc.entities.User.get(uid);
   if(!member||member.is_blocked||member.disabled||!(await playlistProgress(svc,request,uid)).available)continue;
   if(uid!==actor.id&&rows(await svc.entities.Block.filter({$or:[{user_id:uid,blocked_user_id:actor.id},{user_id:actor.id,blocked_user_id:uid}]},'id',1)).length)continue;
   const saved=await svc.entities.Notification.create({user_id:uid,type:'music_request_available',actor_id:actor.id,actor_name:'PUBLIC',target_path:'/music-requests?view=following#request-'+request.id,source_key,comment:'Playlist songs now on PUBLIC: '+request.title,read:false});
   if(!saved?.id)throw Error('Notification was not confirmed.');
  }catch(error){if((error.status??error.response?.status)!==404)pending=true;}
 }
 return pending;
}

async function all(entity,query={},fields){const result=new Map();for(let skip=0;skip<50000;skip+=500){const page=rows(await entity.filter(query,'created_date',500,skip,fields));let added=0;for(const row of page)if(row?.id&&!result.has(row.id)){result.set(row.id,row);added++;}if(page.length<500)return [...result.values()];if(!added)fail('Music requests could not finish loading. Please retry.',503);}fail('Too many requests to load. Please contact support.',503);}
function grouped(records){const map=new Map();for(const row of records){if(!row?.request_key)continue;const old=map.get(row.request_key);if(!old)map.set(row.request_key,{...row,supporter_ids:[...new Set(row.supporter_ids||[])]});else{old.supporter_ids=[...new Set([...old.supporter_ids,...(row.supporter_ids||[])])];if(row.status==='available'&&(row.available_track_id||row.request_kind==='playlist')){old.status='available';old.available_track_id=row.available_track_id;}else if(row.status==='closed'&&old.status==='open')old.status='closed';}}return [...map.values()];}
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
async function canHear(svc,uid,track){if(!track?.id||!track.is_published||track.approval_status!=='approved')return false;const uploader=await svc.entities.User.get(track.uploader_id).catch(error=>{if((error.status??error.response?.status)===404)return null;throw error;});if(!uploader||uploader.is_blocked||uploader.disabled)return false;const found=rows(await svc.entities.Block.filter({$or:[{user_id:uid,blocked_user_id:track.uploader_id},{user_id:track.uploader_id,blocked_user_id:uid}]},'id',1));return !found.length;}
async function canonical(svc,key){if(typeof key!=='string'||!/^[0-9a-f]{64}$/.test(key))fail('Choose a valid music request.',422);const found=grouped(await all(svc.entities.MusicRequest,{request_key:key}));if(!found.length)fail('This music request is no longer available.',404);return found[0];}
async function notify(svc,request,track,actor){let pending=false;for(const uid of request.supporter_ids||[]){try{const member=await svc.entities.User.get(uid);if(!member||member.is_blocked||member.disabled||!await canHear(svc,uid,track))continue;if(uid!==actor.id&&rows(await svc.entities.Block.filter({$or:[{user_id:uid,blocked_user_id:actor.id},{user_id:actor.id,blocked_user_id:uid}]},'id',1)).length)continue;const source_key='music-request:'+request.request_key+':'+track.id;const exists=rows(await svc.entities.Notification.filter({user_id:uid,source_key},'id',1));if(!exists.length){const saved=await svc.entities.Notification.create({user_id:uid,type:'music_request_available',actor_id:actor.id,actor_name:'PUBLIC',track_id:track.id,target_path:'/track/'+encodeURIComponent(track.id),source_key,comment:'Now on PUBLIC: '+request.title+' — '+request.artist,read:false});if(!saved?.id)throw Error('Notification was not confirmed.');}}catch(error){if((error.status??error.response?.status)!==404)pending=true;}}return pending;}
async function fulfill(svc,request,track,actor){if(request.request_kind==='playlist')fail('Use Check available music for playlist requests.',422);if(!await canHear(svc,actor.id,track)||recordingIdentity(track.title,track.artist)!==recordingIdentity(request.title,request.artist))fail('Choose the matching, approved recording on PUBLIC.',422);await svc.entities.MusicRequest.updateMany({request_key:request.request_key},{$set:{status:'available',available_track_id:track.id,resolved_by:actor.id}});const confirmed=await canonical(svc,request.request_key);if(confirmed.status!=='available'||confirmed.available_track_id!==track.id)fail('The song link was not confirmed. Please retry.',503);return {request:confirmed,notification_pending:await notify(svc,confirmed,track,actor)};}
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
   const result=[];for(const r of requests){if(r.status==='closed'&&user.role!=='admin')continue;const progress=r.request_kind==='playlist'?await playlistProgress(svc,r,user.id):null;let available=progress?.available||false;const track=tracks.get(r.available_track_id);if(track&&recordingIdentity(track.title,track.artist)===recordingIdentity(r.title,r.artist))available=await canHear(svc,user.id,track);result.push({...(progress||{}),request_kind:r.request_kind||'song',id:r.id,request_key:r.request_key,title:r.title,artist:r.artist,source_url:r.source_url||'',spotify_url:r.spotify_url||'',artwork_url:r.artwork_url||'',created_date:r.created_date,status:r.status==='closed'?'closed':available?'available':'open',available_track_id:available?r.available_track_id:'',support_count:r.supporter_ids.length,supported:r.supporter_ids.includes(user.id),mine:r.requester_id===user.id});}
   return Response.json({requests:result,can_manage:creators(user),is_admin:user.role==='admin'});
  }
  if(action==='preview_playlist'){const preview=await previewPlaylist(body.source_url),progress=await playlistProgress(svc,preview,user.id);return Response.json({success:true,preview:{...preview,...progress}});}
  if(action==='preview_song'){const preview=typeof body.source_url==='string'&&new URL(sourceLink(body.source_url)).hostname==='open.spotify.com'?await previewSpotifySong(body.source_url):await previewSong(body.source_url);return Response.json({success:true,preview});}
  if(action==='create'){
   if(body.request_kind!=null&&!['song','playlist'].includes(body.request_kind))fail('Choose song or playlist.',422);
   const playlist=body.request_kind==='playlist'?await previewPlaylist(body.source_url):null;
   const title=playlist?.title||text(body.title,'song title',200),artist=playlist?.artist||text(body.artist,'artist',200);if(!normalizeMusic(title)||!normalizeMusic(artist))fail('Enter a song title and artist.',422);
   const rawSource=playlist?.source_url||sourceLink(body.source_url),spotify_url=rawSource&&new URL(rawSource).hostname==='open.spotify.com'?spotifySongSource(rawSource).url:'',source_url=spotify_url||rawSource,artwork_url=playlist?.artwork_url||artworkLink(body.artwork_url),key=playlist?await keyFor('playlist',playlistSource(source_url).id):await keyFor(title,artist);
   return await serialized(key,async()=>{
    let found=grouped(await all(svc.entities.MusicRequest,{request_key:key}));
    if(!found.length){const recent=rows(await svc.entities.MusicRequest.filter({requester_id:user.id,created_date:{$gte:new Date(Date.now()-86400000).toISOString()}},'-created_date',10));if(recent.length>=10)fail('You can request up to 10 new song or playlist requests per day. You can still support existing requests.',429);const saved=await svc.entities.MusicRequest.create({...(playlist?{request_kind:'playlist',playlist_tracks:playlist.playlist_tracks,playlist_total:playlist.playlist_total,playlist_complete:playlist.playlist_complete}:{request_kind:'song'}),request_key:key,title,artist,source_url,spotify_url,artwork_url,requester_id:user.id,supporter_ids:[user.id],status:'open',available_track_id:''});if(!saved?.id)fail('Your request was not confirmed. Please retry.',503);}
    else if(found[0].status==='closed')fail('This request is closed. Please contact support if it needs another review.',409);
    await svc.entities.MusicRequest.updateMany({request_key:key},{$addToSet:{supporter_ids:user.id},...(spotify_url?{$set:{spotify_url}}:{})});
    const confirmed=await canonical(svc,key);if(!confirmed.supporter_ids.includes(user.id))fail('Your request was not confirmed. Please retry.',503);
    let delivery={pending:false,count:0};if(spotify_url){try{delivery=await notifyUploaders(svc,confirmed,user);}catch{delivery.pending=true;}}
    return Response.json({success:true,id:confirmed.id,request_key:key,combined:found.length>0,uploaders_notified:delivery.count,notification_pending:delivery.pending});
   });
  }
  if(action==='notify_uploaders'){return await serialized(body.request_key,async()=>{const request=await canonical(svc,body.request_key);if(!creators(user)&&request.requester_id!==user.id)fail('Only the requester or approved creators can resend this request.',403);if(request.status!=='open'||!request.spotify_url)fail('Choose an open Spotify song request.',422);const delivery=await notifyUploaders(svc,request,user);return Response.json({success:true,uploaders_notified:delivery.count,notification_pending:delivery.pending});});}
  if(action==='refresh_playlist'){
   if(!creators(user))fail('Approved creator access is required.',403);return await serialized(body.request_key,async()=>{const request=await canonical(svc,body.request_key);if(request.request_kind!=='playlist'||request.status==='closed')fail('Choose an open playlist request.',422);playlistCache.delete(playlistSource(request.source_url).id);const preview=await previewPlaylist(request.source_url);await svc.entities.MusicRequest.updateMany({request_key:request.request_key},{$set:{...preview,status:'open',available_track_id:''}});const confirmed=await canonical(svc,request.request_key);if(confirmed.status!=='open'||JSON.stringify(confirmed.playlist_tracks)!==JSON.stringify(preview.playlist_tracks))fail('The refreshed playlist was not confirmed. Please retry.',503);return Response.json({success:true});});
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
   const groupedRequests=grouped(await all(svc.entities.MusicRequest)),requests=groupedRequests.filter(r=>r.status==='open'&&r.request_kind!=='playlist');let matched=0,pending=false;
   for(const request of groupedRequests.filter(r=>r.request_kind==='playlist'&&r.status!=='closed'))await serialized(request.request_key,async()=>{const fresh=await canonical(svc,request.request_key);if(fresh.status==='closed')return;if((await playlistProgress(svc,fresh,user.id)).available){await svc.entities.MusicRequest.updateMany({request_key:fresh.request_key},{$set:{status:'available',resolved_by:user.id}});const confirmed=await canonical(svc,fresh.request_key);if(confirmed.status!=='available')fail('Playlist status was not confirmed. Please retry.',503);if(fresh.status!=='available')matched++;pending=(await notifyPlaylist(svc,confirmed,user))||pending;}});
   for(let i=0;i<requests.length;i+=40){
    const batch=requests.slice(i,i+40),tracks=await all(svc.entities.Track,{is_published:true,approval_status:'approved',$or:batch.flatMap(r=>[r.title.trim().split(/\s+/).map(escape).join('\\s+'),normalizeMusic(r.title).split(' ').map(escape).join('[\\W_]+')].map(pattern=>({title:{$regex:'^'+pattern+'$',$options:'i'}})))},['id','title','artist','uploader_id','duration_seconds','explicit','is_published','approval_status']);
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
