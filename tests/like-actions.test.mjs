import assert from "node:assert/strict";
import {readLikeState,setLikeState,syncPendingLikes} from "../src/lib/likeActions.js";
const saved=new Map();let storageFails=false;
globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>{if(storageFails)throw Error("Storage blocked");saved.set(k,v);}};
Object.defineProperty(globalThis,"navigator",{value:{onLine:true},configurable:true});
globalThis.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options.detail;}};
const events=[];globalThis.window={dispatchEvent:e=>events.push(e)};
let user={id:"me"},likes=[],creates=0,mode="",release;
const client={auth:{me:async()=>user},functions:{invoke:async()=>{throw Error("Backend unavailable");}},entities:{Like:{
 filter:async query=>({items:likes.filter(r=>r.user_id===query.user_id&&r.track_id===query.track_id)}),
 create:async data=>{creates++;if(mode==="wait")await new Promise(r=>release=r);if(mode!=="unconfirmed")likes.push({id:"like-"+creates,...data});if(mode==="lost")throw Error("Connection lost");return {id:"like-"+creates};},
 deleteMany:async query=>{likes=likes.filter(r=>!(r.user_id===query.user_id&&r.track_id===query.track_id));}
}}};
assert.equal(await readLikeState(client,"me","song"),false);
assert.equal((await setLikeState(client,"me","song",true)).liked,true);
assert.equal(creates,1);
assert.equal((await setLikeState(client,"me","song",true)).liked,true);
assert.equal(creates,1,"repeat desired state creates no duplicate");
assert.equal(await readLikeState(client,"me","song"),true);
await setLikeState(client,"me","song",false);assert.equal(likes.length,0);
mode="lost";assert.equal((await setLikeState(client,"me","song",true)).liked,true,"lost response reconciles saved state");
mode="unconfirmed";await assert.rejects(setLikeState(client,"me","missing",true),/not confirmed/);
mode="wait";release=null;
const first=setLikeState(client,"me","second",true),second=setLikeState(client,"me","second",true);
assert.equal(first,second);await assert.rejects(setLikeState(client,"me","second",false),/in progress/);
while(!release)await new Promise(r=>setImmediate(r));release();await first;mode="";
navigator.onLine=false;
assert.equal((await setLikeState(client,"me","offline-song",true)).pending,true);
assert.equal(await readLikeState(client,"me","offline-song"),true);
assert.equal(await readLikeState(client,"another","offline-song"),false,"offline state is account-scoped");
await setLikeState(client,"me","offline-song",false);
navigator.onLine=true;await syncPendingLikes(client,"me");
assert.equal(likes.some(r=>r.track_id==="offline-song"),false,"last offline choice wins");
navigator.onLine=false;await setLikeState(client,"me","queued",true);navigator.onLine=true;
user={id:"another"};await assert.rejects(syncPendingLikes(client,"me"));assert.equal(likes.some(r=>r.track_id==="queued"),false);
user={id:"me"};await syncPendingLikes(client,"me");assert.equal(likes.some(r=>r.track_id==="queued"),true);
const before=creates;await syncPendingLikes(client,"me");assert.equal(creates,before,"confirmed queues do not replay");
navigator.onLine=false;storageFails=true;await assert.rejects(setLikeState(client,"me","unsaved",true),/device/);storageFails=false;navigator.onLine=true;
assert.ok(events.some(e=>e.type==="likes:changed"&&e.detail.liked));
console.log("PASS like persistence, unavailable backend, paged reads, repeated taps, lost responses, offline replay, account isolation and blocked storage");
