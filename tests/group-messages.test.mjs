import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
let handler, uid='a', serial=0;
const data={Conversation:[],Message:[],Block:[],PublicProfile:['a','b','c','d'].map(id=>({user_id:id,display_name:id.toUpperCase(),visible:true,profile_private:id==='c'})),Follow:[{follower_id:'a',following_id:'b'},{follower_id:'b',following_id:'a'}]};
function match(row,q){return Object.entries(q||{}).every(([key,value])=>{
 if(key==='$or')return value.some(item=>match(row,item));
 const actual=row[key];
 if(value&&typeof value==='object'){if('$in'in value)return Array.isArray(actual)?actual.some(item=>value.$in.includes(item)):value.$in.includes(actual);if('$exists'in value)return (actual!==undefined)===value.$exists;if('$gte'in value)return actual>=value.$gte;}
 return Array.isArray(actual)?actual.includes(value):actual===value;
});}
const entities=new Proxy({},{get:(_,entity)=>({
 async filter(q,sort,limit=100,offset=0){const result=(data[entity]||[]).filter(row=>match(row,q));if(typeof sort==='string'){const key=sort.replace(/^-/,'');result.sort((a,b)=>String(a[key]||'').localeCompare(String(b[key]||''))*(sort.startsWith('-')?-1:1));}return structuredClone(result.slice(offset,offset+limit));},
 async get(id){return structuredClone((data[entity]||[]).find(row=>row.id===id));},
 async create(value){const row={...structuredClone(value),id:'row'+(++serial),created_date:new Date(Date.now()+serial).toISOString()};(data[entity]??=[]).push(row);return structuredClone(row);},
 async update(id,patch){const row=data[entity].find(row=>row.id===id);Object.assign(row,structuredClone(patch));return structuredClone(row);},
 async updateMany(q,ops){for(const row of data[entity]||[])if(match(row,q))Object.assign(row,structuredClone(ops.$set));},
 async delete(id){data[entity]=data[entity].filter(row=>row.id!==id);}
})});
globalThis.__groupClient={auth:{me:async()=>({id:uid,display_name:uid.toUpperCase()})},asServiceRole:{entities,integrations:{Core:{CreateFileSignedUrl:async()=>({signed_url:'https://example.test/signed'})}}}};
globalThis.Deno={serve:fn=>{handler=fn;},env:{get:()=>''}};
let source=fs.readFileSync(new URL('../base44/functions/messages/entry.ts',import.meta.url),'utf8').replace(/import.*createClientFromRequest.*;/,"const createClientFromRequest=()=>globalThis.__groupClient;");
source=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
async function invoke(action,body={},as=uid){uid=as;const response=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({action,...body})}));return {status:response.status,...await response.json()};}
const created=await invoke('create_group',{name:'Friends',memberIds:['b','c']},'a');assert.equal(created.status,200);const id=created.id;
let chat=data.Conversation[0];assert.deepEqual(chat.invited_ids,['c']);assert.deepEqual(chat.admin_ids,['a']);
assert.equal((await invoke('read',{id},'d')).status,404);
assert.equal((await invoke('send',{id,text:'Hello'},'c')).status,403);
assert.equal((await invoke('group_update',{id,name:'Denied'},'c')).status,403);
assert.equal((await invoke('send',{id,text:'Hello'},'a')).status,200);
assert.equal(data.Message.length,1);assert.deepEqual(data.Message[0].recipient_ids,['a','b']);
assert.equal((await invoke('read',{id},'c')).messages.length,0);
assert.equal((await invoke('group_respond',{id,accept:true},'c')).status,200);
assert.equal((await invoke('read',{id},'c')).messages.length,1);
assert.equal((await invoke('group_update',{id,name:'Everyone can edit'},'b')).status,200);
assert.equal(chat.group_name,'Everyone can edit');
assert.equal((await invoke('set_background',{id,background:{type:'gradient',value:JSON.stringify({colors:['#ff0000','#0000ff'],motion:'flow',speed:1})}},'b')).status,200);
assert.equal((await invoke('group_remove',{id,memberId:'a'},'b')).status,403);
assert.equal((await invoke('react',{id,messageId:data.Message[0].id,emoji:'🔥'},'c')).status,200);
assert.equal(JSON.parse(data.Message[0].reactions).c,'🔥');
assert.equal((await invoke('react',{id,messageId:data.Message[0].id,emoji:'❤️'},'b')).status,200);
assert.equal(Object.keys(JSON.parse(data.Message[0].reactions)).length,2);
assert.equal((await invoke('send',{id,text:'Reply',replyId:data.Message[0].id},'b')).status,200);
assert.equal(JSON.parse(data.Message[1].reply_preview).sender_name,'A');
assert.equal((await invoke('group_admin',{id,memberId:'b'},'a')).status,200);
assert.equal((await invoke('group_invite',{id,memberId:'d'},'b')).status,200);
assert.equal((await invoke('group_respond',{id,accept:false},'d')).status,200);
assert.ok(!chat.participant_ids.includes('d'));
assert.equal((await invoke('group_mute',{id,enabled:true},'c')).status,200);
assert.ok(chat.muted_ids.includes('c'));
assert.equal((await invoke('group_leave',{id},'a')).status,200);
assert.equal((await invoke('read',{id},'a')).status,404);
assert.ok(chat.admin_ids.includes('b'));
assert.equal((await invoke('create_group',{name:'Too many',memberIds:Array.from({length:20},(_,i)=>'person'+i)},'b')).status,400);
const dm=await entities.Conversation.create({dm_enabled:true,participant_ids:['a','b'],participant_names:['A','B'],dm_status:'accepted',dm_requester:'a'});
assert.equal((await invoke('send',{id:dm.id,text:'Direct message'},'a')).status,200);
assert.equal(data.Message.at(-1).recipient_id,'b');
assert.equal((await invoke('read',{id:dm.id},'b')).messages[0].text,'Direct message');
console.log('PASS group invitations, membership authorization, shared edits, reactions, replies, admin transfer, mute, limits, and DM compatibility');
