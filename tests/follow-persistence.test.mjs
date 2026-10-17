import assert from 'node:assert/strict';
import {setFollowState,followError} from '../src/lib/followActions.js';
let relation=false,creates=0,deletes=0,mode='',user={id:'me'},release;
const client={auth:{me:async()=>user},entities:{Follow:{
 filter:async()=>({items:relation?[{id:'f'}]:[]}),
 create:async()=>{creates++;if(mode==='credits')throw {response:{status:402}};if(mode==='wait')await new Promise(r=>release=r);if(mode!=='unconfirmed')relation=true;if(mode==='lost')throw Error('connection lost');return {id:'f'};},
 deleteMany:async()=>{deletes++;relation=false;}
}}};
assert.deepEqual(await setFollowState(client,'me','them',true),{following:true,changed:true});assert.equal(creates,1);
assert.equal((await setFollowState(client,'me','them',true)).changed,false);assert.equal(creates,1,'already-following is idempotent');
assert.equal((await setFollowState(client,'me','them',false)).following,false);assert.equal(deletes,1);
mode='credits';await assert.rejects(setFollowState(client,'me','them',true));assert.equal(relation,false);assert.match(followError({response:{status:402}}),/integration limit/);
mode='lost';assert.equal((await setFollowState(client,'me','them',true)).following,true,'lost response is reconciled with saved relationship');
relation=false;mode='unconfirmed';await assert.rejects(setFollowState(client,'me','them',true),/not confirmed/);
mode='wait';const first=setFollowState(client,'me','them',true),second=setFollowState(client,'me','them',true);
assert.equal(first,second,'separate buttons share the pending request');
await assert.rejects(setFollowState(client,'me','them',false),/in progress/);
while(!release)await new Promise(r=>setImmediate(r));release();await first;
user={id:'another'};await assert.rejects(setFollowState(client,'me','them',false));assert.equal(relation,true,'account changes cannot mutate previous account');
await assert.rejects(setFollowState(client,'me','me',true));
console.log('PASS follow/unfollow persistence, credit failures, duplicate requests, lost-response recovery, confirmation, self-follow and account isolation');
