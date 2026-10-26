import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const clone=x=>structuredClone(x);
const matches=(r,q)=>Object.entries(q||{}).every(([k,v])=>{
 if(k==='$and')return v.every(x=>matches(r,x));if(k==='$or')return v.some(x=>matches(r,x));
 const value=r[k];
 if(Array.isArray(v))return JSON.stringify(value)===JSON.stringify(v);
 if(v&&typeof v==='object'){if('$in'in v)return Array.isArray(value)?value.some(x=>v.$in.includes(x)):v.$in.includes(value);if('$nin'in v)return !v.$nin.includes(value);if('$ne'in v)return value!==v.$ne;if('$gte'in v)return value>=v.$gte;if('$gt'in v)return value>v.$gt;}
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

const call=(action,args=[])=>invoke(gateway,{entity:'PublicNote',action,args});
reset();
let result=await call('saveNote',[{user_id:'other',track_id:'public',caption:'  On repeat  ',expires_at:'2099-01-01'}]);
assert.equal(result.status,200);
assert.equal(result.data.result.user_id,'owner','caller controls ownership');
assert.equal(result.data.result.caption,'On repeat');
assert.ok(Math.abs(Date.parse(result.data.result.expires_at)-Date.now()-86400000)<5000,'server sets 24-hour lifetime');
assert.equal((await call('readNote',['owner'])).data.result.track.id,'public');
result=await call('saveNote',[{track_id:'public',caption:'On repeat',playback_mode:'clip',clip_start:42,clip_length:15}]);
assert.equal(result.status,200);assert.equal(result.data.result.clip_start,42);
const selected=(await call('readNote',['owner'])).data.result;
assert.equal(selected.playback_mode,'clip');assert.equal(selected.clip_length,15);
assert.equal((await call('saveNote',[{track_id:'public',playback_mode:'clip',clip_start:-1,clip_length:30}])).status,422);
assert.equal((await call('saveNote',[{track_id:'public',playback_mode:'clip',clip_start:10,clip_length:61}])).status,422);

await call('saveNote',[{track_id:'public',caption:'New thought'}]);
assert.equal(db.PublicNote.length,1,'replacement reuses current note');
assert.equal(db.PublicNote[0].caption,'New thought');
assert.equal((await call('saveNote',[{track_id:'private'}])).status,422);
assert.equal((await call('saveNote',[{track_id:'public',caption:'x'.repeat(81)}])).status,422);
assert.equal(db.PublicNote[0].caption,'New thought','invalid draft cannot replace saved note');
assert.equal((await call('saveNote',[{caption:'   '}])).status,422,'blank note cannot be posted');
result=await call('saveNote',[{caption:'Just a thought'}]);
assert.equal(result.status,200);assert.equal(result.data.result.track,null);assert.equal(result.data.result.track_id,'');
assert.equal((await call('readNote',['owner'])).data.result.caption,'Just a thought','text-only note reads without song lookup');
result=await call('saveNote',[{track_id:'public'}]);
assert.equal(result.status,200);assert.equal(result.data.result.caption,'','song-only note needs no caption');
await call('saveNote',[{track_id:'public',caption:'New thought'}]);
globalThis.__client.asServiceRole.integrations.Core.InvokeLLM=async()=>{throw Object.assign(Error('Credits unavailable'),{status:402});};
assert.equal((await call('saveNote',[{track_id:'public',caption:'New thought'}])).status,200,'unchanged caption never repeats an integration review');
assert.equal((await call('saveNote',[{track_id:'public',caption:'Unable to save'}])).status,402);
assert.equal(db.PublicNote[0].caption,'New thought','failed review preserves saved note');
assert.equal((await call('saveNote',[{track_id:'public'}])).status,200,'existing song-only note saves without any review integration');
globalThis.__client.asServiceRole.integrations.Core.InvokeLLM=async()=>{throw {response:{status:402},message:'integration_credits_limit_reached'};};
assert.equal((await call('saveNote',[{track_id:'public',caption:'New caption'}])).status,402,'SDK service-limit status is preserved rather than becoming generic 500');
db.PublicNote[0].expires_at=new Date(Date.now()-1000).toISOString();
assert.equal((await call('readNote',['owner'])).data.result,null,'expired notes never leave server');
db.PublicNote.push({id:'foreign-note',user_id:'other',track_id:'public',caption:'Other',expires_at:new Date(Date.now()+60000).toISOString()});
db.Block=[{user_id:'owner',blocked_user_id:'other'}];
assert.equal((await call('readNote',['other'])).status,403);
db.Block=[];assert.equal((await call('readNote',['other'])).status,200);
assert.equal((await call('update',['foreign-note',{caption:'Forged'}])).status,400,'generic writes cannot bypass note actions');
await call('removeNote');
assert.equal(db.PublicNote.length,1);assert.equal(db.PublicNote[0].user_id,'other','removal stays on caller account');
user=null;assert.equal((await call('readNote',['other'])).status,401);
const schema=JSON.parse(fs.readFileSync('base44/entities/PublicNote.jsonc','utf8'));
for(const rule of Object.values(schema.rls))assert.equal(rule.user_condition.role,'admin','raw SDK cannot bypass gateway');
console.log('PASS PUBLIC Notes ownership, replacement, 24-hour expiry, blocked users, published-song validation, failed-save preservation, isolated removal, and direct-access rules');
reset();
let posted=(await call('saveNote',[{track_id:'public'}])).data.result;
let reactionKey=JSON.stringify([posted.id,posted.expires_at]);
user={id:'other',role:'user'};
result=await call('reactNote',['owner',reactionKey,'🔥','forged-user']);
assert.equal(result.status,200);assert.equal(result.data.result.mine,'🔥');assert.equal(result.data.result.total,1);
assert.equal(db.NoteReaction[0].user_id,'other','server derives reacting account');
await call('reactNote',['owner',reactionKey,'🔥']);
assert.equal(db.NoteReaction.length,1,'retrying same choice is idempotent');
result=await call('reactNote',['owner',reactionKey,'❤️']);
assert.equal(result.data.result.mine,'❤️');assert.equal(result.data.result.total,1,'changing emoji does not add a second person');
await call('reactNote',['owner',reactionKey,'']);
assert.equal(db.NoteReaction.length,0,'reaction can be removed');
assert.equal((await call('reactNote',['owner',reactionKey,'arbitrary text'])).status,422);
await call('reactNote',['owner',reactionKey,'😂']);
user={id:'owner',role:'user'};
assert.equal((await call('noteReactions',['owner',reactionKey])).data.result.counts[0].emoji,'😂','note owner sees persisted visitor reactions');
assert.equal((await call('reactNote',['owner',reactionKey,'🔥'])).status,403,'self reactions are disallowed');
db.Block=[{user_id:'owner',blocked_user_id:'other'}];
assert.equal((await call('noteReactions',['owner',reactionKey])).data.result.total,0,'owner does not see blocked reactors');
user={id:'other',role:'user'};
assert.equal((await call('reactNote',['owner',reactionKey,'🔥'])).status,403,'blocks prevent interaction');
db.Block=[];
db.PublicNote[0].expires_at=new Date(Date.now()+86401000).toISOString();
assert.equal((await call('reactNote',['owner',reactionKey,'🔥'])).status,409,'old viewer cannot react to a replacement');
reactionKey=JSON.stringify([db.PublicNote[0].id,db.PublicNote[0].expires_at]);
assert.equal((await call('noteReactions',['owner',reactionKey])).data.result.total,0,'replacement starts with no previous reactions');
db.PublicNote[0].expires_at=new Date(Date.now()-1000).toISOString();
assert.equal((await call('reactNote',['owner',reactionKey,'🔥'])).status,404,'expired notes reject reactions');
const until=new Date(Date.now()+60000).toISOString();
db.PublicProfile=[{id:'profile-owner',user_id:'owner',visible:true,updated_date:new Date().toISOString(),public_song_note:{mode:'song',track_id:'public',expires_at:until}}];
reactionKey=JSON.stringify(['native:profile-owner',until]);
assert.equal((await call('reactNote',['owner',reactionKey,'😍'])).status,200,'native song notes support reactions');
db.PublicProfile[0].public_song_note.mode='none';
assert.equal((await call('noteReactions',['owner',reactionKey])).status,404,'removed native notes do not expose reactions');
const reactionSchema=JSON.parse(fs.readFileSync('base44/entities/NoteReaction.jsonc','utf8'));
for(const rule of Object.values(reactionSchema.rls))assert.equal(rule.user_condition.role,'admin','direct SDK cannot forge other users reactions');
console.log('PASS persisted note reactions: identity, idempotent changes, removal, owner counts, blocked users, replacement, expiry, native song notes and RLS');
