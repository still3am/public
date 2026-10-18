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


const invoke=async(fn,body)=>{const r=await fn(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};};

for(const motion of ['flow','orbit','tide','still']){
 for(const direction of ['evolve','right','left','up','down','diagonal']){
  reset();
  const r=await invoke(gateway,{entity:'User',action:'update',args:['owner',{profile_background_motion:motion,profile_background_direction:direction,profile_background_speed:1}]});
  assert.equal(r.status,200,JSON.stringify(r.data));
  assert.equal(r.data.result.profile_background_motion,motion);
  assert.equal(r.data.result.profile_background_direction,direction);
  assert.equal(db.PublicProfile[0].profile_background_direction,direction);
  assert.equal(db.PublicProfile[0].profile_background_motion,motion);
 }
}
for(const patch of [{profile_background_motion:'flash'},{profile_background_direction:'random'},{profile_background_direction:7}]){
 reset();assert.equal((await invoke(gateway,{entity:'User',action:'update',args:['owner',patch]})).status,422);assert.equal(writes.length,0);
}
reset();assert.equal((await invoke(gateway,{entity:'User',action:'update',args:['other',{profile_background_direction:'up'}]})).status,403);
for(const path of ['base44/entities/User.jsonc','base44/entities/PublicProfile.jsonc']){
 const schema=JSON.parse(fs.readFileSync(path,'utf8'));
 assert.ok(schema.properties.profile_background_motion.enum.includes('orbit'));
 assert.equal(schema.properties.profile_background_direction.default,'evolve');
}
console.log('PASS all 24 motion/direction saves, public profile mirroring, invalid setting rejection and profile ownership');
