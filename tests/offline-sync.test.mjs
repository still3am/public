import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readAllPages} from '../src/lib/readPages.js';
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
let libraryRows=[];
let user={id:'owner',offline_track_ids:['existing'],offline_migrated:false},legacy=[{tracks:JSON.stringify([{id:'legacy'},{id:'existing'}])}],writes=0,lost=false,ignore=false;
globalThis.__offlineDeps={
 readAllPages,readLibraryRows:async()=>libraryRows,
 base44:{
  auth:{me:async()=>structuredClone(user)},
  functions:{invoke(){throw Error('Offline selections must not invoke a backend function');}},
  entities:{
   OfflineSync:{filter:async query=>{assert.equal(query.user_id,user.id);return legacy;}},
   User:{updateMany:async(query,patch)=>{
    assert.equal(query.id,user.id,'only own account can be updated');writes++;
    if(ignore)return {success:true};
    if(query.offline_migrated&&user.offline_migrated)return {success:true};
    if(patch.$addToSet)user.offline_track_ids=[...new Set([...(user.offline_track_ids||[]),...patch.$addToSet.offline_track_ids.$each])];
    if(patch.$pull)user.offline_track_ids=user.offline_track_ids.filter(id=>!patch.$pull.offline_track_ids.$in.includes(id));
    if(patch.$set)Object.assign(user,patch.$set);
    if(lost)throw Error('response lost after commit');
    return {success:true};
   }}
  }
 }
};
const src=fs.readFileSync('src/lib/offlineSync.js','utf8').replace(/^import[^;]+;/gm,'');
const sync=await import(data('const {base44,readAllPages,readLibraryRows}=globalThis.__offlineDeps;\n'+src));
let cloud=await sync.getCloudList('owner');
assert.deepEqual(cloud.map(t=>t.id).sort(),['existing','legacy']);assert.equal(user.offline_migrated,true);
await Promise.all([sync.addCloudTrack('owner',{id:'phone'}),sync.addCloudTrack('owner',{id:'laptop'})]);
assert.deepEqual(user.offline_track_ids.sort(),['existing','laptop','legacy','phone']);
console.log('PASS legacy account/device migration and simultaneous device additions preserve every selection');
libraryRows=[{track_id:'library-song'}];assert.ok((await sync.getCloudList('owner')).some(t=>t.id==='library-song'));assert.ok(!user.offline_track_ids.includes('library-song'),'library selections need no duplicate offline preference write');libraryRows=[];

await sync.removeCloudTrack('owner','legacy');assert.ok(!(await sync.getCloudList('owner')).some(t=>t.id==='legacy'),'legacy data cannot resurrect removed selections');
lost=true;await sync.addCloudTrack('owner',{id:'committed'});lost=false;assert.ok(user.offline_track_ids.includes('committed'));
ignore=true;await assert.rejects(sync.addCloudTrack('owner',{id:'ignored'}),/changed|retry/);ignore=false;
console.log('PASS removals persist, lost responses reconcile, and unconfirmed saves are rejected');
const before=writes;await assert.rejects(sync.getCloudList('other'),/Sign in/);assert.equal(writes,before);
user.disabled=true;await assert.rejects(sync.addCloudTrack('owner',{id:'no'}),/unavailable/);assert.equal(writes,before);user.disabled=false;
await sync.setCloudList('owner',[]);assert.deepEqual(await sync.getCloudList('owner'),[]);
console.log('PASS foreign-account/suspended access fails and explicit account-list clearing stays cleared');

const schema=JSON.parse(fs.readFileSync('base44/entities/User.jsonc','utf8'));
const evaluate=(rule,record,actor)=>{
 if(rule===true)return true;if(rule===false||!actor)return false;
 if(rule.$and)return rule.$and.every(r=>evaluate(r,record,actor));
 if(rule.$nor)return !rule.$nor.some(r=>evaluate(r,record,actor));
 if(rule.user_condition)return Object.entries(rule.user_condition).every(([k,v])=>actor[k]===v);
 return Object.entries(rule).every(([k,v])=>record[k.replace(/^data\./,'')] === (v==='{{user.id}}'?actor.id:v));
};
for(const name of ['offline_track_ids','offline_migrated']){
 const rule=schema.properties[name].rls;
 assert.equal(evaluate(rule.read,{id:'owner'},{id:'owner'}),true);
 assert.equal(evaluate(rule.read,{id:'owner'},{id:'other'}),false);
 assert.equal(evaluate(rule.write,{id:'owner'},{id:'owner'}),true);
 assert.equal(evaluate(rule.write,{id:'owner'},{id:'other'}),false);
 assert.equal(evaluate(rule.write,{id:'owner'},{id:'owner',is_blocked:true}),false);
 assert.equal(evaluate(rule.write,{id:'owner'},{id:'owner',disabled:true}),false);
}
assert.equal(Object.hasOwn(schema.properties,'role'),false,'offline sync does not add an editable custom role field');
console.log('PASS database field rules explicitly enforce same-user ownership and suspension protection');

// Exercise the real offline hook with controlled storage and two account identities.
let states=[],refs=[],si=0,ri=0,effects=[],uid='owner',offlineOwner='owner',device=new Map(),cloudRows=[{id:'remote'}],failCloud=false,failBackfill=false,authChecks=0;
device.set('local',{id:'local',_blob:{size:10},title:'Local'});
const windowTarget=new EventTarget();globalThis.window=windowTarget;globalThis.localStorage={getItem:()=>null,setItem(){}};
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
globalThis.document={visibilityState:'visible',addEventListener(){},removeEventListener(){}};
const api={
 useAuth:()=>({user:{id:uid}}),useCallback:fn=>fn,useState:initial=>{const i=si++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},
 useRef:initial=>refs[ri++]??(refs[ri-1]={current:initial}),useEffect:fn=>effects.push(fn),
 requestPersistentStorage:async()=>true,getOfflineAccount:()=>offlineOwner,
 listRecords:async()=>[...device.values()],getOrderIds:async()=>[],setOrderIds:async()=>{},getRecord:async id=>device.get(id)||null,
 putTrack:async(track,blob,cover,owner)=>{assert.equal(owner,offlineOwner);device.set(track.id,{...track,_blob:blob});},
 putCoverArt:async()=>{},deleteRecord:async id=>device.delete(id),clearAll:async()=>device.clear(),clearMeta:async()=>{},
 getCloudList:async()=>{if(failCloud)throw Error('sync unavailable');return cloudRows;},
 addCloudTracks:async(owner,tracks)=>{assert.equal(owner,uid);if(failBackfill)throw Error('legacy preferences unavailable');cloudRows=[...new Map([...cloudRows,...tracks].map(t=>[t.id,{id:t.id}])).values()];return tracks.map(t=>({id:t.id}));},
 addCloudTrack:async()=>{},
 base44:{entities:{Track:{get:async id=>{authChecks++;return {id,audio_url:'https://test/'+id};}}}}
};
globalThis.__offlineHook=api;
const names=Object.keys(api).join(',');
const hookSource=fs.readFileSync('src/hooks/useOfflineCache.js','utf8').replace(/^import[^;]+;/gm,'');
const {useOfflineCache}=await import(data('const {'+names+'}=globalThis.__offlineHook;\n'+hookSource));
const render=()=>{si=0;ri=0;effects=[];return useOfflineCache();};
let q=render();effects[0]();await new Promise(r=>setImmediate(r));q=render();
const fetchBefore=globalThis.fetch;globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['audio'],{type:'audio/mpeg'})});
await q.syncFromCloud();q=render();
assert.deepEqual(cloudRows.map(t=>t.id).sort(),['local','remote'],'older local downloads are published to account');
assert.equal(authChecks,1);assert.ok(device.get('remote')?._blob?.size);assert.equal(q.pendingCount,0);
console.log('PASS old-device backfill cannot discard a library-only song and audio downloads only after authorization');
// A failed legacy preference write also cannot block a newly saved library song.
cloudRows=[{id:'new-library'}];failBackfill=true;
await q.refresh();await new Promise(r=>setImmediate(r));q=render();await q.syncFromCloud();q=render();
assert.ok(device.get('new-library')?._blob?.size);assert.equal(q.pendingCount,0);failBackfill=false;
console.log('PASS failed legacy backfill cannot block a new library song');

cloudRows=[{id:'retry-song'}];
let attempts=0;globalThis.fetch=async()=>{attempts++;throw Error('Network interrupted');};
await q.syncFromCloud();q=render();assert.equal(q.pendingCount,1);assert.equal(q.syncError,true);assert.equal(attempts,1);
globalThis.fetch=async()=>{attempts++;return {ok:true,blob:async()=>new Blob(['audio'],{type:'audio/mpeg'})};};
await q.syncFromCloud();assert.equal(attempts,1,'background sync respects retry backoff');
await q.syncFromCloud({retry:true});q=render();assert.equal(attempts,2);assert.ok(device.get('retry-song')?._blob?.size);assert.equal(q.pendingCount,0);
console.log('PASS explicit retry resumes failed offline audio without waiting for background backoff');
failCloud=true;await q.syncFromCloud();q=render();assert.equal(q.syncError,true);assert.equal(device.size,4);
uid='different';offlineOwner='different';window.dispatchEvent(new Event('offlinecache:account'));q=render();
assert.equal(q.records.length,0);assert.equal(q.isCached('remote'),false);
globalThis.fetch=fetchBefore;
console.log('PASS sync failure preserves device audio and account switching hides previous downloads');

// Exercise the mounted coordinator's save event, including account isolation.
let coordinatorEffect,startedDownloads=[];
globalThis.CustomEvent=class extends Event{constructor(type,options){super(type);this.detail=options?.detail;}};
globalThis.__coordinator={
 useEffect:fn=>{coordinatorEffect=fn;},useAuth:()=>({user:{id:'owner'}}),
 useOfflineCache:()=>({syncFromCloud(){},downloadTrack:async(track,options)=>{startedDownloads.push({track,options});return true;}}),
 coalesce:()=>Object.assign(()=>{},{cancel(){}}),base44:{entities:{}}
};
const managerSource=fs.readFileSync('src/components/OfflineSyncManager.jsx','utf8').replace(/^import[^;]+;/gm,'');
const {default:Coordinator}=await import(data('const {useEffect,useAuth,useOfflineCache,coalesce,base44}=globalThis.__coordinator;\n'+managerSource));
Coordinator();const unmount=coordinatorEffect();
window.dispatchEvent(new CustomEvent('library:added',{detail:{uid:'other',id:'foreign'}}));
window.dispatchEvent(new CustomEvent('library:added',{detail:{uid:'owner',id:'just-saved'}}));
assert.deepEqual(startedDownloads,[{track:{id:'just-saved'},options:{automatic:true}}]);
unmount();window.dispatchEvent(new CustomEvent('library:added',{detail:{uid:'owner',id:'after-unmount'}}));
assert.equal(startedDownloads.length,1);
console.log('PASS confirmed library saves trigger immediate automatic download for the active account only');
