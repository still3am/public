import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=p=>fs.readFileSync(p,'utf8');
const load=async(code)=>import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
let caller={id:'viewer',role:'user'},countFails=false,profileFails=false;
const follows=[{id:'f1',follower_id:'viewer',following_id:'other'},{id:'f2',follower_id:'friend',following_id:'viewer'}];
const profiles=Array.from({length:100},(_,i)=>({id:'u'+i,display_name:'Listener '+i,email:'private@example.test'}));
globalThis.__followSDK={auth:{me:async()=>caller},asServiceRole:{entities:{
 User:{filter:async()=>{if(profileFails)throw Error('offline');return {items:profiles};}},
 Follow:{count:async q=>{if(countFails)throw Error('count unavailable');return follows.filter(r=>Object.entries(q).every(([k,v])=>r[k]===v)).length;},filter:async(q,options)=>{const rows=follows.filter(r=>Object.entries(q).every(([k,v])=>r[k]===v));return typeof options==='object'?{items:rows,has_more:false}:rows;}}
}}};
const prepare=p=>source(p).replace(/import\s*\{\s*createClientFromRequest\s*\}\s*from\s*[^;]+;/,'const createClientFromRequest=()=>globalThis.__followSDK;');
const gateway=(await load(prepare('base44/functions/securityGateway/entry.ts'))).default;
const users=(await load(prepare('base44/functions/usersByIds/entry.ts'))).default;
const req=body=>new Request('https://example.test',{method:'POST',body:JSON.stringify(body)});
const details=await users(req({ids:profiles.map(u=>u.id)}));
assert.equal(details.status,200);const data=await details.json();assert.equal(data.users.length,100);assert.equal(data.users[0].email,undefined);
profileFails=true;assert.equal((await users(req({ids:['u1']}))).status,503);profileFails=false;
for(const query of [{follower_id:'viewer'},{following_id:'viewer'}]){
 const r=await gateway(req({entity:'Follow',action:'read',args:['filter',query,{limit:200}]}));
 assert.equal(r.status,200);assert.equal((await r.json()).result.items.length,1);
}
countFails=true;const count=await gateway(req({entity:'Follow',action:'read',args:['count',{following_id:'viewer'}]}));assert.equal((await count.json()).result,1);
assert.equal((await gateway(req({entity:'Follow',action:'read',args:['filter',{},{}]}))).status,400);
caller=null;assert.equal((await gateway(req({entity:'Follow',action:'read',args:['count',{following_id:'viewer'}]}))).status,401);caller={id:'viewer',role:'user'};
globalThis.window={addEventListener(){}};
let failPrimary=true,calls=0;
globalThis.__lookupSDK={functions:{invoke:async(name)=>{calls++;if(name==='usersByIds'&&failPrimary)throw Error('offline');return name==='usersByIds'?{data:{users:[{id:'u1',display_name:'One'}]}}:{data:{result:[{id:'u1',display_name:'One'}]}};}}};
const lookup=(await load(source('src/lib/userLookup.js').replace(/import \{ base44 \}[^;]*;/,'const base44=globalThis.__lookupSDK;'))).getUsersByIds;
assert.equal((await lookup(['u1','u1']))[0].display_name,'One');assert.equal(calls,2);
await lookup(['u1']);assert.equal(calls,2,'cached names avoid duplicate lookups');
console.log('PASS followers/following reads, count fallback, scoped access, full 100-user page hydration, no email disclosure, lookup failure signaling and gateway recovery');
