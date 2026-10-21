import assert from 'node:assert/strict';
import fs from 'node:fs';
// Boot must work with blocked browser storage, including OAuth return parameters.
const source=fs.readFileSync('src/lib/app-params.js','utf8').replaceAll('import.meta.env','({})');
globalThis.window={get localStorage(){throw Error('Storage blocked');},location:{search:'?access_token=fixture-token',pathname:'/profile',hash:'',href:'https://example.test/profile'},history:{replaceState(){}}};
globalThis.document={title:'PUBLIC'};
const {appParams}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(appParams.appId,'6a5676aa61ea8a51237aa4ee');
assert.equal(appParams.token,'fixture-token');
delete globalThis.window;delete globalThis.document;
const nodeParams=await import('data:text/javascript;base64,'+Buffer.from(source+'\n// node import').toString('base64'));
assert.equal(nodeParams.appParams.appId,'6a5676aa61ea8a51237aa4ee');

// A response from the previous profile cannot unlock the current profile request.
const text=fs.readFileSync('src/components/profile/ProfilePlaylists.jsx','utf8');
const start=text.search(/async function load\(/);
const body=text.slice(start,start+text.slice(start).search(/\n\s*useEffect\s*\(/));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const first=deferred(),second=deferred(),version={current:0},lock={current:false},owner={current:'old'},latest={current:{userId:'',rows:[]}},states=[];
const api={entities:{Playlist:{filter:q=>q.creator_id==='old'?first.promise:second.promise}}};
const factory=new Function('userId','active','lock','version','owner','latest','setState','base44',body+';return load;');
const make=uid=>factory(uid,true,lock,version,owner,latest,next=>states.push(next),api);
const old=make('old')();version.current++;owner.current='new';lock.current=false;
const current=make('new')();assert.equal(lock.current,true);
first.resolve([{id:'old-playlist'}]);await old;assert.equal(lock.current,true,'obsolete completion must not release the new request lock');
second.resolve([{id:'new-playlist'}]);await current;assert.equal(lock.current,false);assert.equal(states.at(-1).rows[0].id,'new-playlist');
let response={result:[]};
globalThis.__moments={functions:{invoke:async()=>({data:response})}};
const momentSource=fs.readFileSync('src/lib/momentsApi.js','utf8').replace(/^import[^;]+;/gm,'const base44=globalThis.__moments;');
const {momentsApi}=await import('data:text/javascript;base64,'+Buffer.from(momentSource).toString('base64'));
for(const action of ['feed','get','publish','comments'])await assert.rejects(momentsApi(action),/incomplete response/);
response={items:[]};assert.deepEqual((await momentsApi('feed')).items,[]);
response={post:{id:'post',user_id:'creator'}};assert.equal((await momentsApi('get')).post.id,'post');
response={items:[{id:'comment',author:{user_id:'creator'}}]};assert.equal((await momentsApi('comments')).items.length,1);
console.log('PASS blocked-storage startup, Node imports, profile playlist request isolation and malformed Moments responses');
