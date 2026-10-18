import assert from 'node:assert/strict';
import fs from 'node:fs';
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
mode='credits';await assert.rejects(setFollowState(client,'me','them',true));assert.equal(relation,false);assert.match(followError({response:{status:402}}),/Couldn’t save this follow/);
mode='lost';assert.equal((await setFollowState(client,'me','them',true)).following,true,'lost response is reconciled with saved relationship');
relation=false;mode='unconfirmed';await assert.rejects(setFollowState(client,'me','them',true),/not confirmed/);
mode='wait';const first=setFollowState(client,'me','them',true),second=setFollowState(client,'me','them',true);
assert.equal(first,second,'separate buttons share the pending request');
await assert.rejects(setFollowState(client,'me','them',false),/in progress/);
while(!release)await new Promise(r=>setImmediate(r));release();await first;
user={id:'another'};await assert.rejects(setFollowState(client,'me','them',false));assert.equal(relation,true,'account changes cannot mutate previous account');
await assert.rejects(setFollowState(client,'me','me',true));
const profileSource=fs.readFileSync('src/pages/Profile.jsx','utf8');
const body=profileSource.slice(profileSource.indexOf('  async function toggleFollow()'),profileSource.indexOf('  async function uploadAvatar'));
let stats={followers:1},following=false,section='',resolveSave,rejectSave;
const state={
 profile:{id:'them'},me:{id:'me'},followReady:true,followBusyRef:{current:false},identity:{current:'me:them'},followRevision:{current:0},
 setFollowingBusy(){},setFollowing:v=>following=v,setStats:fn=>stats=fn(stats),setFollowMessage:v=>section=v,
 setFollowState:()=>new Promise((resolve,reject)=>{resolveSave=resolve;rejectSave=reject;}),followError,
 base44:{entities:{Notification:{create:async()=>{throw Error('Notification offline');}}}},
 window:{dispatchEvent(){}},CustomEvent:class{},get following(){return following;}
};
function action(){const keys=Object.keys(state);return new Function(...keys,body+';return toggleFollow;')(...keys.map(k=>state[k]));}
let task=action()();assert.equal(stats.followers,1,'pending save must not invent a follower');assert.equal(following,false);
rejectSave({response:{status:402}});await task;assert.equal(stats.followers,1);assert.equal(following,false);assert.match(section,/Couldn’t save this follow/);
task=action()();resolveSave({following:true,changed:true});await task;
assert.equal(stats.followers,2);assert.equal(following,true,'confirmed follow updates despite notification failure');
console.log('PASS follow persistence, credit failures, duplicate requests, response recovery, account isolation, and truthful profile counts');
