import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const clone=x=>structuredClone(x);
const matches=(r,q)=>Object.entries(q||{}).every(([k,v])=>{
 if(k==='$and')return v.every(x=>matches(r,x));if(k==='$or')return v.some(x=>matches(r,x));
 const value=r[k];
 if(Array.isArray(v))return JSON.stringify(value)===JSON.stringify(v);
 if(v&&typeof v==='object'){if('$in'in v)return Array.isArray(value)?value.some(x=>v.$in.includes(x)):v.$in.includes(value);if('$nin'in v)return !v.$nin.includes(value);if('$ne'in v)return value!==v.$ne;if('$gte'in v)return value>=v.$gte;}
 return value===v;
});
let db={},writes=[],user={id:'owner',role:'user',is_blocked:false},deleted=false,failCleanup=false;
const reset=()=>{
 db={Track:[{id:'private',uploader_id:'owner',approval_status:'private',is_published:false,rights_confirmed:true,artist:'Artist',genre:'Pop',cover_art_url:'https://example.test/cover',explicit:false},{id:'public',uploader_id:'owner',approval_status:'approved',is_published:true,rights_confirmed:true,artist:'Artist',genre:'Pop',cover_art_url:'https://example.test/cover',title:'Old',explicit:false},{id:'explicit',uploader_id:'other',approval_status:'approved',is_published:true,explicit:true},{id:'foreign',uploader_id:'other',approval_status:'approved',is_published:true,explicit:false}],
 User:[{id:'owner',is_blocked:false},{id:'other',is_blocked:false}],LoungeSession:[{id:'room',host_id:'other',is_active:true},{id:'owned-room',host_id:'owner',is_active:true}],LoungeMember:[{id:'other-room-member',session_id:'room',user_id:'third',status:'pending'}],Notification:[{id:'note',user_id:'owner',actor_id:'other',comment:'Original',read:false}],Playlist:[{id:'other-playlist',creator_id:'other'}],Block:[]};writes=[];deleted=false;failCleanup=false;user={id:'owner',role:'user',is_blocked:false};
 const handlers=new Proxy({},{get:(_,name)=>({
  async get(id){const row=(db[name]||[]).find(r=>r.id===id);if(!row)throw Error('Not found');return clone(row);},
  async filter(q,opts){const rows=clone((db[name]||[]).filter(r=>matches(r,q)));return opts&&typeof opts==='object'?{items:rows,has_more:false}:rows;},
  async list(){return clone(db[name]||[]);},
  async create(data){const row={id:name+'-'+Date.now(),...clone(data)};(db[name]??=[]).push(row);writes.push([name,'create']);return clone(row);},
  async update(id,data){const r=(db[name]||[]).find(r=>r.id===id);if(!r)throw Error('Not found');Object.assign(r,clone(data));writes.push([name,'update']);return clone(r);},
  async delete(id){db[name]=(db[name]||[]).filter(r=>r.id!==id);if(name==='User')deleted=true;writes.push([name,'delete']);return {id};},
  async deleteMany(q){if(failCleanup&&name==='LibraryItem')throw Error('Cleanup failed');db[name]=(db[name]||[]).filter(r=>!matches(r,q));},
  async updateMany(q,ops){for(const r of db[name]||[])if(matches(r,q)){
 if(ops.$set)Object.assign(r,clone(ops.$set));
 for(const [key,val]of Object.entries(ops.$addToSet||{})){const add=val&&typeof val==='object'&&'$each'in val?val.$each:[val];r[key]=[...new Set([...(r[key]||[]),...add])];}
 for(const [key,val]of Object.entries(ops.$pull||{})){r[key]=(r[key]||[]).filter(x=>val&&typeof val==='object'&&'$in'in val?!val.$in.includes(x):x!==val);}
}return {};},async count(q){return (db[name]||[]).filter(r=>matches(r,q)).length;}
 })});
 globalThis.__client={auth:{me:async()=>user?clone(user):null},entities:handlers,asServiceRole:{entities:handlers,integrations:{Core:{InvokeLLM:async()=>({allowed:true,reason:''}),CreateFileSignedUrl:async({file_uri})=>({signed_url:"https://signed.example.test/"+file_uri})}}}};
};
const load=async path=>{
 let code=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/import\s*\{\s*createClientFromRequest\s*\}\s*from\s*[^;]+;/,"const createClientFromRequest=()=>globalThis.__client;");
 code=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 return (await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
};
const gateway=await load('base44/functions/securityGateway/entry.ts');
const approve=await load('base44/functions/loungeApprove/entry.ts');
const deletion=await load('base44/functions/deleteMyAccount/entry.ts');
const invoke=async(fn,body)=>{const r=await fn(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};};
let passed=0;const check=async(name,run)=>{reset();await run();passed++;console.log('PASS '+name);};
await check('anonymous mutation rejected',async()=>{user=null;assert.equal((await invoke(gateway,{entity:'Track',action:'create',args:[{}]})).status,401);});
await check('owner self-publication rejected',async()=>{const r=await invoke(gateway,{entity:'Track',action:'create',args:[{title:'Song',rights_confirmed:true,is_published:true,approval_status:'approved'}]});assert.equal(r.status,403);assert.equal(writes.length,0);});
await check('missing rights rejected before write',async()=>{assert.equal((await invoke(gateway,{entity:'Track',action:'create',args:[{title:'Song'}]})).status,422);assert.equal(writes.length,0);});
await check('complete owner upload is pending',async()=>{const r=await invoke(gateway,{entity:'Track',action:'create',args:[{title:'Song',audio_url:'https://example.test/audio',rights_confirmed:true,artist:'A',genre:'Pop',cover_art_url:'https://example.test/cover'}]});assert.equal(r.status,200);assert.equal(r.data.result.approval_status,'pending');assert.equal(r.data.result.is_published,false);assert.equal(r.data.result.uploader_id,'owner');});
await check('published edit returns to moderation',async()=>{const r=await invoke(gateway,{entity:'Track',action:'update',args:['public',{title:'New'}]});assert.equal(r.status,200);assert.equal(r.data.result.is_published,false);assert.equal(r.data.result.approval_status,'pending');});
await check('another uploader cannot edit',async()=>{assert.equal((await invoke(gateway,{entity:'Track',action:'update',args:['foreign',{title:'New'}]})).status,403);});
await check('private ID cannot be read by guest',async()=>{user=null;assert.equal((await invoke(gateway,{entity:'Track',action:'read',args:['get','private']})).status,404);});
await check('guest catalog includes published explicit songs but excludes private uploads',async()=>{user=null;const r=await invoke(gateway,{entity:'Track',action:'read',args:['filter',{},{}]});assert.equal(r.status,200);assert.deepEqual(r.data.result.items.map(t=>t.id),['public','explicit','foreign']);});
await check('lyrics require track ownership',async()=>{assert.equal((await invoke(gateway,{entity:'Lyrics',action:'create',args:[{track_id:'foreign',lines:[]}]})).status,403);});
await check('guests cannot self-approve lounge membership',async()=>{const r=await invoke(gateway,{entity:'LoungeMember',action:'create',args:[{session_id:'room',role:'host',status:'approved'}]});assert.equal(r.status,200);assert.equal(r.data.result.role,'guest');assert.equal(r.data.result.status,'pending');});
await check('unapproved guest cannot insert queue items',async()=>{assert.equal((await invoke(gateway,{entity:'LoungeQueueItem',action:'create',args:[{session_id:'room',track_id:'public'}]})).status,403);});
await check('host cannot approve foreign-session member',async()=>{assert.equal((await invoke(approve,{session_id:'owned-room',member_id:'other-room-member',action:'approve'})).status,403);});
await check('explicit catalog is visible without adult declaration',async()=>{user.show_explicit=true;user.adult_confirmed=false;const r=await invoke(gateway,{entity:'Track',action:'read',args:['filter',{is_published:true},{}]});assert.equal(r.status,200);assert.ok(r.data.result.items.some(t=>t.id==='explicit'));});
await check('confirmed explicit listener sees explicit published catalog',async()=>{user.show_explicit=true;user.adult_confirmed=true;const r=await invoke(gateway,{entity:'Track',action:'read',args:['filter',{is_published:true},{}]});assert.equal(r.status,200);assert.ok(r.data.result.items.some(t=>t.id==='explicit'));});
await check('legacy disabled explicit preference cannot hide published songs',async()=>{user.show_explicit=false;user.adult_confirmed=true;const r=await invoke(gateway,{entity:'Track',action:'read',args:['filter',{is_published:true},{}]});assert.ok(r.data.result.items.some(t=>t.id==='explicit'));});
await check('explicit preference requires adult declaration',async()=>{assert.equal((await invoke(gateway,{entity:'User',action:'update',args:['owner',{show_explicit:true}]})).status,422);});
await check('recipient update cannot alter message text',async()=>{const r=await invoke(gateway,{entity:'Notification',action:'update',args:['note',{read:true,comment:'Forged'}]});assert.equal(r.status,200);assert.equal(r.data.result.comment,'Original');assert.equal(r.data.result.read,true);});
await check('foreign playlist edits denied',async()=>{assert.equal((await invoke(gateway,{entity:'Playlist',action:'update',args:['other-playlist',{name:'Hacked'}]})).status,403);});
await check('suspended account cannot write',async()=>{user.is_blocked=true;assert.equal((await invoke(gateway,{entity:'Track',action:'create',args:[{}]})).status,403);});
await check('onboarding username normalized and mirrored',async()=>{const r=await invoke(gateway,{entity:'User',action:'update',args:['owner',{username:'@My_Sound',display_name:'Listener'}]});assert.equal(r.status,200);assert.equal(r.data.result.username,'my_sound');assert.equal(db.PublicProfile[0].username,'my_sound');});
await check('taken username rejected before writing',async()=>{db.User[1].username='taken';const r=await invoke(gateway,{entity:'User',action:'update',args:['owner',{username:'taken'}]});assert.equal(r.status,409);assert.equal(writes.length,0);});
await check('invalid username rejected before writing',async()=>{const r=await invoke(gateway,{entity:'User',action:'update',args:['owner',{username:'bad name'}]});assert.equal(r.status,422);assert.equal(writes.length,0);});
await check('identity update cannot promote listener',async()=>{const r=await invoke(gateway,{entity:'User',action:'update',args:['owner',{username:'my_sound',role:'admin'}]});assert.equal(r.status,200);assert.equal(r.data.result.role,undefined);});
await check('repeated follow returns confirmed response',async()=>{db.Follow=[{id:'follow',follower_id:'owner',following_id:'other'}];const r=await invoke(gateway,{entity:'Follow',action:'create',args:[{following_id:'other'}]});assert.equal(r.status,200);assert.equal(r.data.result.id,'follow');assert.equal(db.Follow.length,1);});
await check('cleanup failure does not claim account deleted',async()=>{failCleanup=true;const r=await invoke(deletion,{});assert.equal(r.status,500);assert.equal(deleted,false);assert.notEqual(r.data.success,true);});
await check('complete cleanup removes identity',async()=>{const r=await invoke(deletion,{});assert.equal(r.status,200);assert.equal(r.data.deleted,true);assert.equal(deleted,true);});
await check('authorized playback signs private audio',async()=>{db.Track[1].audio_file_uri='private/owner/audio.mp3';db.Track[1].audio_url='';const r=await invoke(gateway,{entity:'Track',action:'read',args:['get','public']});assert.equal(r.status,200);assert.equal(r.data.result._private_audio,true);assert.match(r.data.result.audio_url,/^https:\/\/signed/);});
await check('public catalog hides private storage URI',async()=>{db.Track[1].audio_file_uri='private/owner/audio.mp3';user=null;const r=await invoke(gateway,{entity:'Track',action:'read',args:['filter',{},{}]});assert.equal(r.status,200);assert.equal(r.data.result.items[0].audio_file_uri,undefined);assert.equal(r.data.result.items[0].audio_url,'');});
await check('malformed lyric timing is rejected',async()=>{const r=await invoke(gateway,{entity:'Lyrics',action:'create',args:[{track_id:'public',lines:[{text:'One',start_time_ms:200,end_time_ms:100}]}]});assert.equal(r.status,422);});
await check('mutual block prevents sharing',async()=>{db.Block=[{user_id:'other',blocked_user_id:'owner'}];const r=await invoke(gateway,{entity:'Notification',action:'create',args:[{user_id:'other',type:'track_shared',track_id:'public'}]});assert.equal(r.status,403);});
const safety=await load('base44/functions/safety/entry.ts');
await check('support receipt cannot be opened with another token',async()=>{const r=await invoke(safety,{action:'contact',subject:'Playback issue',message:'The track stops while I am listening.'});assert.equal(r.status,200);const denied=await invoke(safety,{action:'ticket',id:r.data.id,token:'wrong'});assert.equal(denied.status,403);const allowed=await invoke(safety,{action:'ticket',id:r.data.id,token:r.data.token});assert.equal(allowed.status,200);assert.equal(allowed.data.ticket.access_hash,undefined);});
await check('anonymous checksum lookup rejected',async()=>{user=null;assert.equal((await invoke(gateway,{entity:'Track',action:'checkDuplicate',args:[{audio_sha256:'a'.repeat(64)}]})).status,401);});
await check('invalid checksum rejected',async()=>{assert.equal((await invoke(gateway,{entity:'Track',action:'checkDuplicate',args:[{audio_sha256:'bad'}]})).status,400);});
await check('private foreign checksum never reported',async()=>{db.Track.push({id:'secret',uploader_id:'other',is_published:false,approval_status:'private',audio_sha256:'a'.repeat(64)});const r=await invoke(gateway,{entity:'Track',action:'checkDuplicate',args:[{audio_sha256:'a'.repeat(64)}]});assert.equal(r.status,200);assert.equal(r.data.result.duplicate,false);});
await check('identical public file rejected on create',async()=>{db.Track[1].audio_sha256='a'.repeat(64);const r=await invoke(gateway,{entity:'Track',action:'create',args:[{title:'Changed tags',rights_confirmed:true,audio_sha256:'a'.repeat(64)}]});assert.equal(r.status,409);assert.equal(writes.length,0);});
await check('upload retry reuses the original record',async()=>{db.Track[0].upload_request_id='retry-key';const r=await invoke(gateway,{entity:'Track',action:'create',args:[{upload_request_id:'retry-key',rights_confirmed:true}]});assert.equal(r.status,200);assert.equal(r.data.result.id,'private');assert.equal(writes.length,0);});
await check('mark all read affects only current recipient',async()=>{db.Notification.push({id:'someone-else',user_id:'other',read:false});const r=await invoke(safety,{action:'markAllRead',user_id:'other'});assert.equal(r.status,200);assert.equal(db.Notification[0].read,true);assert.equal(db.Notification[1].read,false);});
await check('playlist owner can add without duplicate IDs',async()=>{db.Playlist.push({id:'owned',creator_id:'owner',track_ids:['public']});const r=await invoke(gateway,{entity:'Playlist',action:'playlistAdd',args:['owned',['foreign','foreign']]});assert.equal(r.status,200);assert.deepEqual(r.data.result.track_ids,['public','foreign']);});
await check('concurrent playlist additions both survive',async()=>{db.Playlist.push({id:'owned',creator_id:'owner',track_ids:[]});await Promise.all(['public','foreign'].map(id=>invoke(gateway,{entity:'Playlist',action:'playlistAdd',args:['owned',[id]]})));assert.deepEqual(db.Playlist.find(p=>p.id==='owned').track_ids.sort(),['foreign','public']);});
await check('foreign playlist song mutation denied',async()=>{assert.equal((await invoke(gateway,{entity:'Playlist',action:'playlistAdd',args:['other-playlist',['public']]})).status,403);});
await check('stale playlist reorder cannot overwrite newer order',async()=>{db.Playlist.push({id:'owned',creator_id:'owner',track_ids:['public','foreign']});const r=await invoke(gateway,{entity:'Playlist',action:'playlistReorder',args:['owned',['foreign','public'],['public']]});assert.equal(r.status,409);assert.deepEqual(db.Playlist.find(p=>p.id==='owned').track_ids,['public','foreign']);});
await check('playlist reorder retains all songs',async()=>{db.Playlist.push({id:'owned',creator_id:'owner',track_ids:['public','foreign']});assert.equal((await invoke(gateway,{entity:'Playlist',action:'playlistReorder',args:['owned',['public'],['public','foreign']]})).status,400);const r=await invoke(gateway,{entity:'Playlist',action:'playlistReorder',args:['owned',['foreign','public'],['public','foreign']]});assert.equal(r.status,200);assert.deepEqual(r.data.result.track_ids,['foreign','public']);});
await check('playlist removal deletes only associations',async()=>{db.Playlist.push({id:'owned',creator_id:'owner',track_ids:['public','foreign']});const before=db.Track.length;const r=await invoke(gateway,{entity:'Playlist',action:'playlistRemove',args:['owned',['public']]});assert.equal(r.status,200);assert.deepEqual(r.data.result.track_ids,['foreign']);assert.equal(db.Track.length,before);});
await check('playlist deletion cleans saved references but preserves songs',async()=>{db.Playlist.push({id:'owned',creator_id:'owner',track_ids:['public']});db.SavedPlaylist=[{playlist_id:'owned',user_id:'other'}];const before=db.Track.length;assert.equal((await invoke(gateway,{entity:'Playlist',action:'delete',args:['owned']})).status,200);assert.equal(db.SavedPlaylist.length,0);assert.equal(db.Track.length,before);});
await check('shared song keeps the authenticated sender and intended recipient',async()=>{const r=await invoke(gateway,{entity:'Notification',action:'create',args:[{user_id:'other',type:'track_shared',actor_id:'spoofed',track_id:'public',comment:'Listen to this'}]});assert.equal(r.status,200);assert.equal(r.data.result.actor_id,'owner');assert.equal(r.data.result.user_id,'other');assert.equal(r.data.result.track_id,'public');});
console.log(JSON.stringify({passed,total:passed,environment:'isolated mocked SDK; no live data changed'}));

let backendFiles=0,syntaxErrors=0;
for(const name of fs.readdirSync(new URL('../base44/functions/',import.meta.url))){const path=new URL('../base44/functions/'+name+'/entry.ts',import.meta.url);if(!fs.existsSync(path))continue;backendFiles++;const r=ts.transpileModule(fs.readFileSync(path,'utf8'),{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});syntaxErrors+=(r.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length;}
assert.equal(syntaxErrors,0);console.log(JSON.stringify({backend_files:backendFiles,syntax_errors:syntaxErrors}));
