import assert from 'node:assert/strict';
import fs from 'node:fs';
const {selectRecording,findSongInfo,lookupItunesCover,selectReleaseCover}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('src/lib/songInfo.js','utf8')).toString('base64'));
const id='fc64447c-0e19-4d2f-aa70-6397380fc163';
const record={id,title:'Yellow',length:269000,score:100,'artist-credit':[{name:'Coldplay'}]};
const track={title:'Yellow',artist:'Coldplay',duration_seconds:269};
assert.equal(selectRecording(track,[record]).id,id);
assert.equal(selectRecording({...track,artist:'Other'},[record]),null);
assert.equal(selectRecording({...track,title:'Yellow (Live)'},[record]),null);
assert.equal(selectRecording({...track,duration_seconds:180},[record]),null);
assert.equal(selectRecording({...track,duration_seconds:0},[record,{...record,id:'ac64447c-0e19-4d2f-aa70-6397380fc163',length:300000}]),null);
let calls=0;globalThis.fetch=async()=>({ok:true,json:async()=>++calls===1?{recordings:[record]}:{...record,releases:[{status:'Official',title:'Parachutes',date:'2000-07-10'}],relations:[{type:'producer',artist:{name:'Ken Nelson'}}]}});
const info=await findSongInfo(track);assert.equal(info.album,'Parachutes');assert.equal(info.producer,'Ken Nelson');await findSongInfo(track);assert.equal(calls,2);
console.log('PASS song matching rejects wrong artists, versions, duration and ambiguity; metadata cache');
const originalFetch=globalThis.fetch;
try{
 globalThis.fetch=async()=>new Response(JSON.stringify({results:[{trackName:'Options (feat. Lil Baby)',artistName:'Jordan Adetunji',collectionName:'Options (feat. Lil Baby) - Single',artworkUrl100:'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cover.jpg/100x100bb.jpg'}]}),{headers:{'content-type':'application/json'}});
 const high=await lookupItunesCover({title:'Options (feat. Lil Baby)',artist:'Jordan Adetunji, Lil Baby',album_name:'Options (feat. Lil Baby) - Single'});
 assert.ok(high.url.endsWith('/4096x4096bb.jpg'));
 assert.ok(high.url.includes('mzstatic.com'));
}finally{globalThis.fetch=originalFetch;}
assert.equal(selectReleaseCover([{front:true,approved:true,image:'https://archive.org/full-resolution.jpg',thumbnails:{1200:'https://archive.org/1200.jpg'}}]),'https://archive.org/full-resolution.jpg');
console.log('PASS high-resolution iTunes cover lookup and original Cover Art Archive image preference');
