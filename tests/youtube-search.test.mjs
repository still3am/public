import assert from 'node:assert/strict';
import fs from 'node:fs';
const {searchMusicVideos}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('src/lib/youtubeSearch.js','utf8')).toString('base64'));
const requests=[];
globalThis.fetch=async url=>{
 requests.push(new URL(url));
 return {ok:true,json:async()=>requests.length===1?{items:[{id:{videoId:'abcdefghijk'}},{id:{videoId:'bad'}}]}:{items:[
 {id:'abcdefghijk',status:{embeddable:true,privacyStatus:'public'},snippet:{title:'Artist song',channelTitle:'Artist'}},
 {id:'ABCDEFGHIJK',status:{embeddable:false,privacyStatus:'public'},snippet:{}},
 {id:'12345678901',status:{embeddable:true,privacyStatus:'private'},snippet:{}}
 ]}};
const track={artist:'Artist',title:'Song'};
const result=await searchMusicVideos(track,'test-key');
assert.equal(result.length,1);
assert.equal(requests[0].searchParams.get('videoEmbeddable'),'true');
assert.equal(requests[0].searchParams.get('videoSyndicated'),'true');
assert.equal(requests[1].searchParams.get('id'),'abcdefghijk');
await searchMusicVideos(track,'test-key');assert.equal(requests.length,2,'reuse short-lived search results');
await assert.rejects(searchMusicVideos(track,''),/not configured/);
globalThis.fetch=async()=>({ok:false,status:403,json:async()=>({error:{errors:[{reason:'quotaExceeded'}]}})});
await assert.rejects(searchMusicVideos({artist:'Other',title:'Other'},'test-key'),/daily limit/);
console.log('PASS official YouTube search filters, verification, cache and quota errors');
