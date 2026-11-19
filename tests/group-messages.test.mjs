import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
let handler, uid='a', serial=0;
const cursorPages=new Map();let cursorSerial=0;
const data={Conversation:[],Message:[],Block:[],PublicProfile:['a','b','c','d'].map(id=>({user_id:id,display_name:id.toUpperCase(),visible:true,profile_private:id==='c'})),Follow:[{follower_id:'a',following_id:'b'},{follower_id:'b',following_id:'a'}]};
function match(row,q){return Object.entries(q||{}).every(([key,value])=>{
 if(key==='$or')return value.some(item=>match(row,item));
 const actual=row[key];
 if(value&&typeof value==='object')return Object.entries(value).every(([op,expected])=>{
   if(op==='$in')return Array.isArray(actual)?actual.some(item=>expected.includes(item)):expected.includes(actual);
   if(op==='$nin')return !expected.includes(actual);
   if(op==='$exists')return (actual!==undefined)===expected;
   if(op==='$gte')return actual>=expected;
   if(op==='$regex')return typeof actual==='string'&&new RegExp(expected).test(actual);
   if(op==='$not')return !match({value:actual},{value:expected});
   return false;
 });
 return Array.isArray(actual)?actual.includes(value):actual===value;
});}
const entities=new Proxy({},{get:(_,entity)=>({
 async filter(q,sort,limit=100,offset=0){
 if(sort&&typeof sort==='object'){
   const size=sort.limit||100;
   let selection;
   if(sort.cursor){const saved=cursorPages.get(sort.cursor);if(!saved)throw Error('Invalid cursor');selection=saved.map(id=>(data[entity]||[]).find(row=>row.id===id)).filter(Boolean);}
   else{selection=(data[entity]||[]).filter(row=>match(row,q));const key=(sort.sort||'-created_date').replace(/^-/,'');selection.sort((a,b)=>String(b[key]||'').localeCompare(String(a[key]||'')));}
   let next=null;if(selection.length>size){next='cursor'+(++cursorSerial);cursorPages.set(next,selection.slice(size).map(row=>row.id));}
   return {items:structuredClone(selection.slice(0,size)),has_more:Boolean(next),next_cursor:next};
 }
 const result=(data[entity]||[]).filter(row=>match(row,q));if(typeof sort==='string'){const key=sort.replace(/^-/,'');result.sort((a,b)=>String(a[key]||'').localeCompare(String(b[key]||''))*(sort.startsWith('-')?-1:1));}return structuredClone(result.slice(offset,offset+limit));},
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
assert.equal((await invoke('inbox',{},'b')).conversations[0].unread,true);
await invoke('read',{id},'b');
assert.equal((await invoke('inbox',{},'b')).conversations[0].unread,false);
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
// A retry after a lost response must return the original group.
const retryKey='11111111-1111-4111-8111-111111111111';
const first=await invoke('create_group',{name:'Retry safe',memberIds:['b','c'],requestId:retryKey},'a');
const again=await invoke('create_group',{name:'Retry safe',memberIds:['b','c'],requestId:retryKey},'a');
assert.equal(first.id,again.id);
// A creator can send the introduction while everyone else has an invitation.
const allPending=await invoke('create_group',{name:'Invitations',memberIds:['c','d']},'a');
assert.equal((await invoke('send',{id:allPending.id,text:'Welcome when you join'},'a')).status,200);
assert.equal((await invoke('read',{id:allPending.id},'d')).messages.length,0);
const accepts=await Promise.all([invoke('group_respond',{id:allPending.id,accept:true},'c'),invoke('group_respond',{id:allPending.id,accept:true},'d')]);
assert.ok(accepts.every(result=>result.status===200));
const concurrent=data.Conversation.find(chat=>chat.id===allPending.id);
assert.deepEqual(concurrent.invited_ids,[],'parallel accepts must both be preserved');
const mutes=await Promise.all([invoke('group_mute',{id:allPending.id,enabled:true},'c'),invoke('group_mute',{id:allPending.id,enabled:true},'d')]);
assert.ok(mutes.every(result=>result.status===200));
assert.ok(concurrent.muted_ids.includes('c')&&concurrent.muted_ids.includes('d'),'parallel mute preferences must both be preserved');
const reads=await Promise.all([invoke('read',{id:allPending.id},'c'),invoke('read',{id:allPending.id},'d')]);
assert.ok(reads.every(result=>result.status===200));
const readState=JSON.parse(concurrent.group_reads);
assert.ok(readState.c&&readState.d,'parallel read markers must both be preserved');
assert.equal((await invoke('group_respond',{id:allPending.id,accept:true},'c')).status,200,'accept retry should be harmless');
assert.equal((await invoke('group_remove',{id:allPending.id,memberId:'d'},'a')).status,200);
assert.equal((await invoke('send',{id:allPending.id,text:'Not a member'},'d')).status,404);
assert.equal((await invoke('set_background',{id:allPending.id,background:{type:'none'}},'d')).status,404);
assert.equal((await invoke('read',{id:allPending.id},'d')).status,404);
// The next accepting member becomes admin if the creator leaves before approval.
const orphan=await invoke('create_group',{name:'Next admin',memberIds:['c','d']},'a');
assert.equal((await invoke('group_leave',{id:orphan.id},'a')).status,200);
assert.equal((await invoke('group_respond',{id:orphan.id,accept:true},'c')).status,200);
assert.deepEqual(data.Conversation.find(chat=>chat.id===orphan.id).admin_ids,['c']);
// Run identical shared-feature checks against a DM and an accepted group.
data.Track=[{id:'song',title:'Song',artist:'Artist',is_published:true,approval_status:'approved',duration_seconds:180}];
globalThis.__groupClient.integrations=globalThis.__groupClient.asServiceRole.integrations;
for(const conversation of [dm.id,first.id]){
  assert.equal((await invoke('send',{id:conversation,text:'Same message'},'a')).status,200);
  const message=data.Message.at(-1);
  assert.equal((await invoke('react',{id:conversation,messageId:message.id,emoji:'👍'},'b')).status,200);
  assert.equal((await invoke('react',{id:conversation,messageId:message.id,emoji:''},'b')).status,200);
  assert.equal(JSON.parse(data.Message.find(row=>row.id===message.id).reactions).b,'');
  assert.equal((await invoke('set_background',{id:conversation,background:{type:'color',value:'#123456'}},'b')).status,200);
  assert.equal((await invoke('send',{id:conversation,text:'',trackId:'song'},'a')).status,200);
  assert.equal((await invoke('send',{id:conversation,text:'',trackId:'song',lyrics:{lines:['An original test lyric'],startMs:1000,animated:true}},'a')).status,200);
  assert.equal((await invoke('send',{id:conversation,text:'',media:{type:'image',uri:'private/test.png'}},'a')).status,200);
  assert.equal((await invoke('open_media',{id:conversation,messageId:data.Message.at(-1).id},'b')).status,200);
  assert.equal((await invoke('mute',{id:conversation,enabled:true},'b')).status,200);
  assert.equal((await invoke('inbox',{},'b')).conversations.find(row=>row.id===conversation).unread,false);
  assert.equal((await invoke('mute',{id:conversation,enabled:false},'b')).status,200);
}
// Cursor history remains scoped to its conversation and is stable as messages arrive.
const historyChat=await entities.Conversation.create({dm_enabled:true,participant_ids:['a','b'],participant_names:['A','B'],dm_status:'accepted',dm_requester:'a'});
for(let index=0;index<135;index++)await entities.Message.create({conversation_id:historyChat.id,sender_id:'a',recipient_id:'b',text:'History '+index});
const latestPage=await invoke('read',{id:historyChat.id},'b');
assert.equal(latestPage.messages.length,100);assert.ok(latestPage.nextCursor);
await entities.Message.create({conversation_id:historyChat.id,sender_id:'a',recipient_id:'b',text:'Arrived during pagination'});
const earlierPage=await invoke('history',{id:historyChat.id,cursor:latestPage.nextCursor},'b');
assert.equal(earlierPage.messages.length,35);assert.equal(earlierPage.nextCursor,null);
assert.equal(new Set([...latestPage.messages,...earlierPage.messages].map(message=>message.id)).size,135);
assert.equal((await invoke('history',{id:historyChat.id,cursor:latestPage.nextCursor},'d')).status,404);
assert.equal((await invoke('history',{id:dm.id,cursor:latestPage.nextCursor},'a')).status,403);
assert.equal((await invoke('history',{id:historyChat.id,cursor:''},'b')).status,400);
// Attachment tabs query all messages, not just the conversation's recent window.
for(let index=0;index<46;index++)data.Message.push({id:'photo'+index,conversation_id:historyChat.id,sender_id:'a',recipient_id:'b',text:'',media_type:'image',media_url:'private/photo'+index,created_date:new Date(1000+index).toISOString()});
for(let index=0;index<42;index++)data.Message.push({id:'gif'+index,conversation_id:historyChat.id,sender_id:'a',recipient_id:'b',text:'',media_type:'image',media_url:'https://media.giphy.com/media/gif'+index+'/giphy.gif',created_date:new Date(2000+index).toISOString()});
data.Message.push({id:'old-song',conversation_id:historyChat.id,sender_id:'a',recipient_id:'b',track_id:'song',created_date:new Date(500).toISOString()});
const photos=await invoke('shared',{id:historyChat.id,kind:'photos'},'b');
assert.equal(photos.status,200);assert.equal(photos.messages.length,40);assert.ok(photos.nextCursor);
assert.ok(photos.messages.every(message=>message.media_url.startsWith('private/')));
const morePhotos=await invoke('shared',{id:historyChat.id,kind:'photos',cursor:photos.nextCursor},'b');
assert.equal(morePhotos.messages.length,6);
const gifs=await invoke('shared',{id:historyChat.id,kind:'gifs'},'b');assert.equal(gifs.messages.length,40);
const music=await invoke('shared',{id:historyChat.id,kind:'music'},'b');assert.equal(music.messages[0].id,'old-song');
assert.equal((await invoke('shared',{id:historyChat.id,kind:'photos'},'d')).status,404);
assert.equal((await invoke('shared',{id:historyChat.id,kind:'music',cursor:photos.nextCursor},'b')).status,403);
assert.equal((await invoke('shared',{id:historyChat.id,kind:'unknown'},'b')).status,400);
// Reply previews preserve the sender and distinguish each media kind.
const quoteChat = await entities.Conversation.create({
  dm_enabled: true,
  participant_ids: ['quote-author', 'quote-reader'],
  participant_names: ['Older name', 'Reader'],
  dm_status: 'accepted',
  dm_requester: 'quote-author',
});
for (const [mediaType, mediaUrl, expected] of [
  ['image', 'private/photo.png', 'Sent a photo'],
  ['video', 'private/video.mp4', 'Sent a video'],
  ['image', 'https://media.giphy.com/media/example/giphy.gif', 'Sent a GIF'],
]) {
  const original = await entities.Message.create({
    conversation_id: quoteChat.id,
    sender_id: 'quote-author',
    recipient_id: 'quote-reader',
    sender_name: 'Saved sender name',
    text: '',
    media_type: mediaType,
    media_url: mediaUrl,
  });
  const response = await invoke('send', {
    id: quoteChat.id, text: 'Reply', replyId: original.id,
  }, 'quote-reader');
  assert.equal(response.status, 200);
  const reply = data.Message.find(message => message.reply_to_id === original.id);
  const preview = JSON.parse(reply.reply_preview);
  assert.equal(preview.text, expected);
  assert.equal(preview.sender_name, 'Saved sender name');
  assert.equal(preview.message.id, original.id);
  assert.equal(preview.message.media_type, mediaType);
  assert.equal(preview.message.media_url, mediaUrl);
  assert.equal(preview.message.reply_preview, undefined);
  // Older replies acquire a media snapshot when their original remains available.
  reply.reply_preview = JSON.stringify({ sender_name: 'Saved sender name', text: expected });
  const refreshed = await invoke('read', { id: quoteChat.id }, 'quote-reader');
  const legacyReply = refreshed.messages.find(message => message.id === reply.id);
  assert.equal(JSON.parse(legacyReply.reply_preview).message.media_url, mediaUrl);
}
// Concurrent typing identifies each active member and excludes invited people.
const typingChat = await entities.Conversation.create({
  dm_enabled: true, is_group: true,
  participant_ids: ['a', 'b', 'c', 'd'],
  participant_names: ['A', 'B', 'C', 'D'],
  invited_ids: ['d'], admin_ids: ['a'], dm_status: 'accepted',
});
assert.equal((await invoke('typing', { id: typingChat.id, typing: true }, 'b')).status, 200);
assert.equal((await invoke('typing', { id: typingChat.id, typing: true }, 'c')).status, 200);
let typingStatus = await invoke('typing_status', { id: typingChat.id }, 'a');
assert.equal(typingStatus.typing, true);
assert.deepEqual(typingStatus.people.map(person => person.id).sort(), ['b', 'c']);
assert.equal((await invoke('typing', { id: typingChat.id, typing: true }, 'd')).status, 403);
await invoke('typing', { id: typingChat.id, typing: false }, 'b');
typingStatus = await invoke('typing_status', { id: typingChat.id }, 'a');
assert.deepEqual(typingStatus.people.map(person => person.id), ['c']);
const staleTyping = data.MessageTyping.find(record => record.conversation_id === typingChat.id && record.user_id === 'c');
staleTyping.updated_at = new Date(Date.now() - 6000).toISOString();
typingStatus = await invoke('typing_status', { id: typingChat.id }, 'a');
assert.equal(typingStatus.typing, false);
assert.deepEqual(typingStatus.people, []);
console.log('PASS group invitations, membership authorization, shared edits, reactions, replies, admin transfer, mute, limits, DM compatibility, parallel updates, creation retries, pending introductions, and removed-member access');
