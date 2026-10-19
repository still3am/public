import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const importSource=source=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
let shape='array',peopleFail=false,primaryFail=false;
const tracks=[{id:'t1',title:'Denzel song',artist:'Artist',play_count:1}];
globalThis.window={addEventListener(){}};
globalThis.__searchMock={
 entities:{
  Track:{filter:async()=>shape==='array'?tracks:{items:tracks}},
  Artist:{filter:async()=>shape==='array'?[]:{items:[]}},
  Playlist:{filter:async()=>shape==='array'?[{id:'p1',name:'Denzel mix'}]:{items:[{id:'p1',name:'Denzel mix'}]}}
 },
 functions:{invoke:async(name)=>{if(peopleFail||(primaryFail&&name==='searchUsers'))throw Error('network');return name==='securityGateway'?{data:{result:[{id:'u1',display_name:'3AM'}]}}:{data:{results:[{id:'u1',display_name:'3AM'}]}}}}
};
globalThis.__matching=await import('../src/lib/searchMatching.js');
let source=read('src/lib/globalSearch.js').replace(/import \{scoreTrack,searchScore\}[^;]*;/,'const {scoreTrack,searchScore}=globalThis.__matching;').replace(/import \{ base44 \}[^;]*;/,'const base44=globalThis.__searchMock;').replace(/import \{ splitArtistNames \}[^;]*;/,'const splitArtistNames=name=>[name];');
source=source.replace(/import \{ getPublishedTracks,getArtists,peekPublishedTracks \}[^;]*;/,'const peekPublishedTracks=()=>[],getPublishedTracks=async()=>[],getArtists=async()=>[];');
const {globalSearch}=await importSource(source);
for(const mode of ['array','page']){
 shape=mode;const res=await globalSearch('Denzel '+mode,{fresh:true});
 assert.equal(res.tracks[0].id,'t1');assert.equal(res.playlists[0].id,'p1');assert.equal(res.people[0].id,'u1');
}
const originalTrackFilter=globalThis.__searchMock.entities.Track.filter;
globalThis.__searchMock.entities.Track.filter=async()=>{throw Error('music unavailable');};
const onlyPeople=await globalSearch('Denzel people',{scope:'people',fresh:true});
assert.equal(onlyPeople.people[0].id,'u1');assert.equal(onlyPeople.tracks.length,0);assert.equal(onlyPeople.failed,false);
globalThis.__searchMock.entities.Track.filter=originalTrackFilter;
peopleFail=true;const partial=await globalSearch('Denzel retry');assert.equal(partial.tracks.length,1);assert.equal(partial.peopleFailed,true);
peopleFail=false;const retried=await globalSearch('Denzel retry');assert.equal(retried.people.length,1,'failed directory results must not be cached');
primaryFail=true;const fallback=await globalSearch('gateway fallback',{fresh:true});assert.equal(fallback.people[0].id,'u1');assert.equal(fallback.peopleFailed,false);
globalThis.__usersMock={
 auth:{me:async()=>({id:'caller'})},
 asServiceRole:{entities:{User:{filter:async(query,sort,limit,skip,fields)=>{assert.equal(limit,30);assert.deepEqual(fields,['id','display_name','full_name','avatar_url','is_blocked']);return [{id:'u1',display_name:'3AM',full_name:'Denzel Valdez',email:'private@example.com',bio:'private detail'}];}}}}
};
source=read('base44/functions/searchUsers/entry.ts').replace(/import \{ createClientFromRequest \}[^;]*;/,'const createClientFromRequest=()=>globalThis.__usersMock;');
const {default:handler}=await importSource(source);
const response=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({q:'denzel'})}));
assert.equal(response.status,200);const data=await response.json();assert.equal(data.results.length,1);assert.equal(data.results[0].id,'u1');assert.equal(data.results[0].email,undefined);assert.equal(data.results[0].full_name,undefined);assert.equal(data.results[0].bio,undefined);
const originalDirectoryFilter=globalThis.__usersMock.asServiceRole.entities.User.filter;
globalThis.__usersMock.asServiceRole.entities.User.filter=async()=>[];
globalThis.__usersMock.asServiceRole.entities.User.list=async(sort,limit,skip,fields)=>{assert.equal(limit,200);assert.ok(!fields.includes('email'));return [{id:'u1',display_name:'3AM',full_name:'Denzel Valdez'}];};
const legacy=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({q:'denzel'})}));
assert.equal((await legacy.json()).results[0].display_name,'3AM');
globalThis.__usersMock.asServiceRole.entities.User.filter=originalDirectoryFilter;

source=read('base44/functions/securityGateway/entry.ts').replace(/import \{ createClientFromRequest \}[^;]*;/,'const createClientFromRequest=()=>globalThis.__usersMock;');
const gateway=(await importSource(source)).default;
const gatewayResponse=await gateway(new Request('https://example.test',{method:'POST',body:JSON.stringify({entity:'User',action:'searchPublic',args:['Denzel']})}));
assert.equal(gatewayResponse.status,200);assert.equal((await gatewayResponse.json()).result[0].display_name,'3AM');
console.log('PASS search array/page results, independent people failure, retry without stale error cache, full-name match behind alias, suspended filtering and private-field exclusion');
