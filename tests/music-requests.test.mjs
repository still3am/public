import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
globalThis.crypto??=webcrypto;
const clone=value=>structuredClone(value);
const matches=(row,q)=>Object.entries(q||{}).every(([key,value])=>{
 if(key==='$or')return value.some(item=>matches(row,item));if(key==='$and')return value.every(item=>matches(row,item));
 const actual=row[key];if(value&&typeof value==='object'){if('$in' in value)return Array.isArray(actual)?actual.some(v=>value.$in.includes(v)):value.$in.includes(actual);if('$gte' in value)return actual>=value.$gte;if('$ne' in value)return actual!==value.$ne;if('$regex' in value)return new RegExp(value.$regex,value.$options||'').test(String(actual||''));}
 return actual===value;
});
let activeClient;
globalThis.__musicRequestClient=()=>activeClient;
const code=fs.readFileSync('base44/functions/music-requests/entry.ts','utf8').replace(/import\s*\{\s*createClientFromRequest\s*\}\s*from\s*[^;]+;/,'const createClientFromRequest=()=>globalThis.__musicRequestClient();');
const mod=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function fixture(){
 let caller='a',ignored=false,failNotes=false,sequence=0;
 const db={User:[{id:'a',role:'user'},{id:'b',role:'user'},{id:'c',role:'user'},{id:'creator',role:'user',creator_role:'uploader'},{id:'admin',role:'admin'},{id:'artist-owner',role:'user',creator_role:'artist'}],MusicRequest:[],Notification:[],Track:[],Block:[]};
 const entities=new Proxy({},{get:(_,name)=>({
  get:async id=>{const row=(db[name]||[]).find(row=>row.id===id);if(!row)throw Object.assign(Error('Not found'),{status:404});return clone(row);},
  filter:async(q,sort,limit=500,skip=0)=>clone((db[name]||[]).filter(row=>matches(row,q)).slice(skip,skip+limit)),
  create:async values=>{if(name==='Notification'&&failNotes)throw Error('Notification unavailable');const row={id:'row'+(++sequence),created_date:new Date().toISOString(),...clone(values)};(db[name]??=[]).push(row);return clone(row);},
  updateMany:async(q,patch)=>{if(ignored)return {success:true};for(const row of db[name]||[])if(matches(row,q)){
   if(patch.$set)Object.assign(row,clone(patch.$set));for(const [key,value]of Object.entries(patch.$addToSet||{}))row[key]=[...new Set([...(row[key]||[]),...(value?.$each||[value])])];for(const [key,value]of Object.entries(patch.$pull||{}))row[key]=(row[key]||[]).filter(item=>item!==value);
  }return {success:true};}
 })});
 activeClient={auth:{me:async()=>caller?{id:caller,role:'admin'}:null},asServiceRole:{entities}};
 const call=async(action,values={})=>{const response=await mod.default(new Request('https://example.test',{method:'POST',body:JSON.stringify({...values,action})}));return {status:response.status,data:await response.json()};};
 return {db,call,user:value=>{caller=value;},ignore:value=>{ignored=value;},notesFail:value=>{failNotes=value;}};
}
let f=fixture();f.user(null);assert.equal((await f.call('list')).status,401);f.user('a');f.db.User[0].is_blocked=true;assert.equal((await f.call('create',{title:'Song',artist:'Artist'})).status,403);f.db.User[0].is_blocked=false;
for(const source_url of ['http://open.spotify.com/track/x','https://evil.example/a','https://user:secret@music.apple.com/song/x','javascript:alert(1)'])assert.equal((await f.call('create',{title:'Song',artist:'Artist',source_url})).status,422);
assert.equal((await f.call('create',{title:'',artist:'Artist'})).status,422);assert.equal((await f.call('create',{title:'Song',artist:'Artist',artwork_url:'https://evil.example/track.gif'})).status,422);
let r=await f.call('create',{title:'Dior',artist:'Pop Smoke',source_url:'https://open.spotify.com/track/x?si=tracking',supporter_ids:['spoofed'],requester_id:'spoofed'});assert.equal(r.status,200);const key=r.data.request_key;assert.equal(f.db.MusicRequest[0].source_url,'https://open.spotify.com/track/x');assert.equal(f.db.MusicRequest[0].requester_id,'a');assert.deepEqual(f.db.MusicRequest[0].supporter_ids,['a']);
r=await f.call('create',{title:' DIOR ',artist:'POP SMOKE'});assert.equal(r.data.combined,true);assert.equal(f.db.MusicRequest.length,1);
f.user('b');await f.call('create',{title:'Dior',artist:'Pop Smoke'});let list=(await f.call('list')).data.requests;assert.equal(list.length,1);assert.equal(list[0].support_count,2);assert.equal(list[0].supported,true);for(const field of ['supporter_ids','requester_id','resolved_by','email'])assert.equal(list[0][field],undefined);
// Even duplicate records produced by separate workers are one request with unique demand.
f.db.MusicRequest.push({...clone(f.db.MusicRequest[0]),id:'duplicate',supporter_ids:['b','c']});list=(await f.call('list')).data.requests;assert.equal(list.length,1);assert.equal(list[0].support_count,3);
await f.call('support',{request_key:key,support:false});assert.ok(f.db.MusicRequest.every(row=>!row.supporter_ids.includes('b')));assert.equal((await f.call('list')).data.requests[0].support_count,2);
f.ignore(true);r=await f.call('support',{request_key:key,support:true});assert.equal(r.status,503);f.ignore(false);
console.log('PASS request validation, private supporters, duplicate merging, unique support and confirmed writes');
const song={id:'song',title:'Dior',artist:'Pop Smoke',uploader_id:'artist-owner',is_published:true,approval_status:'approved',duration_seconds:180};f.db.Track.push(song,{...song,id:'private',is_published:false},{...song,id:'wrong',title:'Dior (Live)'});
assert.equal((await f.call('fulfill',{request_key:key,track_id:'song'})).status,403,'fresh database role wins over forged caller role');f.user('creator');assert.equal((await f.call('fulfill',{request_key:key,track_id:'private'})).status,422);assert.equal((await f.call('fulfill',{request_key:key,track_id:'wrong'})).status,422);
f.db.Block.push({user_id:'c',blocked_user_id:'artist-owner'});f.notesFail(true);r=await f.call('fulfill',{request_key:key,track_id:'song'});assert.equal(r.status,200);assert.equal(r.data.notification_pending,true);assert.ok(f.db.MusicRequest.every(row=>row.status==='available'));
f.notesFail(false);await f.call('fulfill',{request_key:key,track_id:'song'});await f.call('fulfill',{request_key:key,track_id:'song'});assert.equal(f.db.Notification.length,1);assert.equal(f.db.Notification[0].user_id,'a');assert.equal(f.db.Notification[0].type,'music_request_available');assert.equal(f.db.Notification[0].target_path,'/track/song');
f.user('c');list=(await f.call('list')).data.requests;assert.equal(list[0].status,'open');assert.equal(list[0].available_track_id,'','blocked recordings never gain a playback link');f.user('a');song.is_published=false;assert.equal((await f.call('list')).data.requests[0].status,'open');song.is_published=true;
f.user('creator');assert.equal((await f.call('close',{request_key:key})).status,403);f.user('admin');assert.equal((await f.call('close',{request_key:key})).status,200);f.user('a');assert.equal((await f.call('list')).data.requests.length,0);assert.equal((await f.call('support',{request_key:key,support:true})).status,409);f.user('admin');assert.equal((await f.call('reopen',{request_key:key})).status,200);
console.log('PASS creator-only fulfillment, exact recordings, publication/block checks, delivery retries, admin close/reopen');
f=fixture();r=await f.call('create',{title:'Midnight',artist:'Artist'});const openKey=r.data.request_key;f.db.Track.push({id:'midnight',title:'MIDNIGHT',artist:'ARTIST',uploader_id:'artist-owner',is_published:true,approval_status:'approved',duration_seconds:180});f.user('creator');r=await f.call('reconcile');assert.equal(r.status,200);assert.equal(r.data.matched,1);assert.equal(f.db.Notification.length,1);assert.equal(f.db.MusicRequest[0].available_track_id,'midnight');
f.user('a');await f.call('create',{title:'Edition',artist:'Artist'});f.db.Track.push({id:'clean',title:'Edition',artist:'Artist',uploader_id:'artist-owner',is_published:true,approval_status:'approved',explicit:false,duration_seconds:180},{id:'explicit',title:'Edition',artist:'Artist',uploader_id:'artist-owner',is_published:true,approval_status:'approved',explicit:true,duration_seconds:180});f.user('creator');assert.equal((await f.call('reconcile')).data.matched,0);assert.equal(f.db.MusicRequest.find(row=>row.title==='Edition').status,'open');
f.user('a');assert.equal((await f.call('reconcile')).status,403);
f=fixture();await Promise.all([f.call('create',{title:'Concurrent',artist:'Artist'}),f.call('create',{title:'Concurrent',artist:'Artist'})]);assert.equal(f.db.MusicRequest.length,1);assert.equal(f.db.MusicRequest[0].supporter_ids.length,1);
for(let i=1;i<10;i++)assert.equal((await f.call('create',{title:'Song '+i,artist:'Artist'})).status,200);assert.equal((await f.call('create',{title:'Too many',artist:'Artist'})).status,429);
const schema=JSON.parse(fs.readFileSync('base44/entities/music-request.jsonc','utf8'));for(const action of ['create','read','update','delete'])assert.equal(schema.rls[action],false);
assert.equal(mod.recordingIdentity('Song (Live)','Artist')===mod.recordingIdentity('Song','Artist'),false);assert.equal(mod.recordingIdentity('Song','Drake, Future'),mod.recordingIdentity('SONG','Future & Drake'));
console.log('PASS automatic exact matching, edition ambiguity, concurrency, daily limit and server-only entity access');

f=fixture();await f.call('create',{title:'Déjà Vu',artist:'Beyoncé'});f.db.Track.push({id:'accent',title:'Déjà Vu',artist:'Beyoncé',uploader_id:'artist-owner',is_published:true,approval_status:'approved'});f.user('creator');assert.equal((await f.call('reconcile')).data.matched,1);f.user('admin');assert.equal((await f.call('close')).status,422);
console.log('PASS accented titles match automatically and missing request keys cannot close another request');
