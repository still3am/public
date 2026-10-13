import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const client={auth:{me:async()=>({id:'viewer',role:'user'})},asServiceRole:{entities:{
 User:{filter:async()=>[{id:'other',display_name:'Listener',avatar_url:''}]},
 Track:{get:async()=>({id:'song',uploader_id:'viewer',title:'Song',audio_url:'https://example.test/song.mp3',is_published:true,approval_status:'approved'})}
}}};
globalThis.__registrationClient=client;
let registered;
globalThis.Deno={serve:handler=>{assert.equal(typeof handler,'function');assert.equal(registered,undefined,'exactly one handler per entry');registered=handler;}};
const handlers={};
for(const name of fs.readdirSync(new URL('../base44/functions/',import.meta.url))){
 const path=new URL('../base44/functions/'+name+'/entry.ts',import.meta.url);
 if(!fs.existsSync(path))continue;
 let source=fs.readFileSync(path,'utf8').replace(/import \{ createClientFromRequest \} from [^;]+;/,'const createClientFromRequest=()=>globalThis.__registrationClient;');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 registered=undefined;
 const module=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 assert.equal(registered,module.default,name+' registers its actual exported request handler');
 handlers[name]=registered;
}
const request=body=>new Request('https://example.test',{method:'POST',body:JSON.stringify(body)});
const search=await handlers.searchUsers(request({q:'Listener'}));
assert.equal(search.status,200);assert.equal((await search.json()).results[0].id,'other');
const track=await handlers.securityGateway(request({entity:'Track',action:'read',args:['get','song']}));
assert.equal(track.status,200);assert.equal((await track.json()).result.id,'song');
console.log('PASS '+Object.keys(handlers).length+' HTTP entry registrations; registered people-search and track-read handlers accept requests');
delete globalThis.Deno;
