import assert from "node:assert/strict";
import fs from "node:fs";
import {followWrite,setFollowState} from "../src/lib/followActions.js";
let user,target,blocked,db,writes,fallbacks,mode,reads;
function reset(){user={id:"admin",role:"admin"};target={id:"person"};blocked=[];db=[];writes=0;fallbacks=0;mode="";reads=0;}
reset();
const native={auth:{me:async()=>{reads++;return mode==="switch"&&reads>3?{id:"other",role:"admin"}:user;}},entities:{
 Block:{filter:async()=>({items:blocked})},User:{get:async()=>target},
 Follow:{filter:async()=>({items:db.map(x=>({...x}))}),create:async data=>{writes++;const row={id:"f"+writes,...data};if(mode!=="ignored")db.push(row);if(mode==="lost")throw Error("Lost response");return row;},
 delete:async id=>{writes++;if(mode!=="ignored")db=db.filter(r=>r.id!==id);}}
}};
const fallback=async()=>{fallbacks++;throw Object.assign(Error("Service unavailable"),{status:402});};
const client={auth:native.auth,entities:{Follow:{...native.entities.Follow,create:q=>followWrite(native,"create",[q],fallback),deleteMany:q=>followWrite(native,"deleteMany",[q],fallback)}}};
assert.equal((await setFollowState(client,"admin","person",true)).following,true);
assert.equal(fallbacks,0);assert.equal(db.length,1);
assert.equal((await setFollowState(client,"admin","person",true)).changed,false);
assert.equal((await setFollowState(client,"admin","person",false)).following,false);
reset();mode="lost";assert.equal((await setFollowState(client,"admin","person",true)).following,true);
reset();mode="ignored";await assert.rejects(setFollowState(client,"admin","person",true),/not confirmed/);
for(const block of [{user_id:"admin",blocked_user_id:"person"},{user_id:"person",blocked_user_id:"admin"}]){
 reset();blocked=[block];await assert.rejects(setFollowState(client,"admin","person",true));assert.equal(writes,0);
}
for(const state of [{disabled:true},{is_blocked:true}]){
 reset();Object.assign(target,state);await assert.rejects(setFollowState(client,"admin","person",true));assert.equal(writes,0);
 reset();Object.assign(user,state);await assert.rejects(setFollowState(client,"admin","person",true));assert.equal(writes,0);
}
reset();mode="switch";await assert.rejects(setFollowState(client,"admin","person",true));assert.equal(writes,0);
reset();user={id:"member",role:"user"};await assert.rejects(setFollowState(client,"member","person",true));assert.equal(fallbacks,1);assert.equal(writes,0);
reset();await assert.rejects(followWrite(native,"deleteMany",[{following_id:"person"}],fallback));assert.equal(writes,0);
reset();db=[{id:"a",follower_id:"admin",following_id:"person"},{id:"b",follower_id:"admin",following_id:"person"}];
await setFollowState(client,"admin","person",false);assert.equal(db.length,0);
reset();db=[{id:"a",follower_id:"admin",following_id:"person"}];mode="ignored";
await assert.rejects(setFollowState(client,"admin","person",false),/not confirmed/);
const schema=JSON.parse(fs.readFileSync("base44/entities/Follow.jsonc","utf8"));
assert.deepEqual(schema.rls.create,{user_condition:{role:"admin"}});
assert.deepEqual(schema.rls.delete,{user_condition:{role:"admin"}});
assert.match(fs.readFileSync("src/api/base44Client.js","utf8"),/followWrite\(raw,method,args/);
console.log("PASS native admin follows without functions, idempotency, blocks, disabled targets, lost writes, account switches, unfollow and unchanged regular-user authorization");
