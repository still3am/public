import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const importSource=source=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
let shape='array',peopleFail=false;
const tracks=[{id:'t1',title:'Denzel song',artist:'Artist',play_count:1}];
globalThis.window={addEventListener(){}};
globalThis.__searchMock={
 entities:{
  Track:{filter:async()=>shape==='array'?tracks:{items:tracks}},
  Artist:{filter:async()=>shape==='array'?[]:{items:[]}},
  Playlist:{filter:async()=>shape==='array'?[{id:'p1',name:'Denzel mix'}]:{items:[{id:'p1',name:'Denzel mix'}]}}
 },
 functions:{invoke:async()=>{if(peopleFail)throw Error('network');return {data:{results:[{id:'u1',display_name:'3AM'}]}}}
};
let source=read('src/lib/globalSearch.js').replace(/import \{ base44 \}[^;]*;/,'const base44=globalThis.__searchMock;').replace(/import \{ splitArtistNames \}[^;]*;/,'const splitArtistNames=name=>[name];');
const {globalSearch}=await importSource(source);
for(const mode of ['array','page']){
 shape=mode;const res=await globalSearch('Denzel '+mode,{fresh:true});
 assert.equal(res.tracks[0].id,'t1');assert.equal(res.playlists[0].id,'p1');assert.equal(res.people[0].id,'u1');
}
peopleFail=true;const partial=await globalSearch('Denzel retry');assert.equal(partial.tracks.length,1);assert.equal(partial.peopleFailed,true);
peopleFail=false;const retried=await globalSearch('Denzel retry');assert.equal(retried.people.length,1,'failed directory results must not be cached');
globalThis.__usersMock={
 auth:{me:async()=>({id:'caller'})},
 asServiceRole:{entities:{User:{filter:async()=>[{id:'u1',display_name:'3AM',full_name:'Denzel Valdez',email:'private@example.com'},{id:'u2',display_name:'Denzel',is_blocked:true}]}}}
};
source=read('base44/functions/searchUsers/entry.ts').replace(/import \{ createClientFromRequest \}[^;]*;/,'const createClientFromRequest=()=>globalThis.__usersMock;');
const {default:handler}=await importSource(source);
const response=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({q:'denzel'})}));
assert.equal(response.status,200);const data=await response.json();assert.equal(data.results.length,1);assert.equal(data.results[0].id,'u1');assert.equal(data.results[0].email,undefined);
console.log('PASS search array/page results, independent people failure, retry without stale error cache, full-name match behind alias, suspended filtering and private-field exclusion');
