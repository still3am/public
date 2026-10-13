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
let source=read('src/lib/globalSearch.js').replace(/import \{ base44 \}[^;]*;/,'const base44=globalThis.__searchMock;').replace(/import \{ splitArtistNames \}[^;]*;/,'const splitArtistNames=name=>[name];');
const {globalSearch}=await importSource(source);
for(const mode of ['array','page']){
 shape=mode;const res=await globalSearch('Denzel '+mode,{fresh:true});
 assert.equal(res.tracks[0].id,'t1');assert.equal(res.playlists[0].id,'p1');assert.equal(res.people[0].id,'u1');
}
peopleFail=true;const partial=await globalSearch('Denzel retry');assert.equal(partial.tracks.length,1);assert.equal(partial.peopleFailed,true);
peopleFail=false;const retried=await globalSearch('Denzel retry');assert.equal(retried.people.length,1,'failed directory results must not be cached');
primaryFail=true;const fallback=await globalSearch('gateway fallback',{fresh:true});assert.equal(fallback.people[0].id,'u1');assert.equal(fallback.peopleFailed,false);
globalThis.__usersMock={
 auth:{me:async()=>({id:'caller'})},
 asServiceRole:{entities:{User:{filter:async(query,sort,limit,skip,fields)=>{assert.equal(limit,30);assert.equal(query.disabled.$ne,true);assert.deepEqual(fields,['id','display_name','full_name','avatar_url']);return [{id:'u1',display_name:'3AM',full_name:'Denzel Valdez',email:'private@example.com',bio:'private detail'}];}}}}
};
source=read('base44/functions/searchUsers/entry.ts').replace(/import \{ createClientFromRequest \}[^;]*;/,'const createClientFromRequest=()=>globalThis.__usersMock;');
const {default:handler}=await importSource(source);
const response=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({q:'denzel'})}));
assert.equal(response.status,200);const data=await response.json();assert.equal(data.results.length,1);assert.equal(data.results[0].id,'u1');assert.equal(data.results[0].email,undefined);assert.equal(data.results[0].full_name,undefined);assert.equal(data.results[0].bio,undefined);
source=read('base44/functions/securityGateway/entry.ts').replace(/import \{ createClientFromRequest \}[^;]*;/,'const createClientFromRequest=()=>globalThis.__usersMock;');
const gateway=(await importSource(source)).default;
const gatewayResponse=await gateway(new Request('https://example.test',{method:'POST',body:JSON.stringify({entity:'User',action:'searchPublic',args:['Denzel']})}));
assert.equal(gatewayResponse.status,200);assert.equal((await gatewayResponse.json()).result[0].display_name,'3AM');
console.log('PASS search array/page results, independent people failure, retry without stale error cache, full-name match behind alias, suspended filtering and private-field exclusion');
