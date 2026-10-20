import assert from 'node:assert/strict';
import fs from 'node:fs';
import {savePlaylistInvitation} from '../src/lib/playlistInvitations.js';
const copy=v=>structuredClone(v);
function fixture(){
 const playlist={id:'p',creator_id:'owner',track_ids:['song'],name:'Private mix'};
 let user={id:'owner',role:'user'},mode='',blocks=[],visible=true,legacy=['old'],calls=0;
 const db={auth:{me:async()=>{calls++;return copy(user);}},entities:{
  Playlist:{get:async()=>copy(playlist),updateMany:async(q,p)=>{
   assert.equal(q.creator_id,'owner');
   if(q.collaborator_ids?.$exists===false&&Array.isArray(playlist.collaborator_ids))return;
   if(mode==='reject')throw Error('Unavailable');
   if(mode==='ignore')return;
   if(p.$set)Object.assign(playlist,p.$set);
   if(p.$addToSet)playlist.collaborator_ids=[...new Set([...playlist.collaborator_ids,p.$addToSet.collaborator_ids])];
   if(p.$pull)playlist.collaborator_ids=playlist.collaborator_ids.filter(id=>id!==p.$pull.collaborator_ids);
   if(mode==='lost')throw Error('Response lost');
  }},
  PlaylistCollaboration:{filter:async()=>[{id:'legacy',member_ids:legacy}]},
  PublicProfile:{filter:async q=>visible?[{user_id:q.user_id}]:[]},
  Block:{filter:async()=>blocks}
 },functions:{invoke:()=>{throw Error('Invitations must not invoke a backend function');}}};
 return {playlist,db,user,mode:v=>mode=v,block:()=>blocks=[{}],hide:()=>visible=false,calls:()=>calls};
}
let f=fixture();let saved=await savePlaylistInvitation(f.db,'p','new',true);
assert.deepEqual(saved.collaborator_ids,['old','new']);assert.equal(saved.collaboration_enabled,true);assert.deepEqual(f.playlist.track_ids,['song']);
await savePlaylistInvitation(f.db,'p','old',false);assert.deepEqual(f.playlist.collaborator_ids,['new'],'removed legacy member must not return');
f=fixture();f.mode('lost');assert.ok((await savePlaylistInvitation(f.db,'p','new',true)).collaborator_ids.includes('new'));
f=fixture();f.mode('ignore');await assert.rejects(savePlaylistInvitation(f.db,'p','new',true),/not confirmed/);
f=fixture();f.mode('reject');await assert.rejects(savePlaylistInvitation(f.db,'p','new',true),/Unavailable/);
f=fixture();f.user.id='stranger';await assert.rejects(savePlaylistInvitation(f.db,'p','new',true),e=>e.status===403);assert.equal(f.playlist.collaborator_ids,undefined);
f=fixture();f.user.disabled=true;await assert.rejects(savePlaylistInvitation(f.db,'p','new',true),e=>e.status===401);
f=fixture();f.block();await assert.rejects(savePlaylistInvitation(f.db,'p','new',true),/blocked/);
f=fixture();f.hide();await assert.rejects(savePlaylistInvitation(f.db,'p','new',true),e=>e.status===404);
f=fixture();await assert.rejects(savePlaylistInvitation(f.db,'p','owner',true),/already has access/);
f=fixture();f.playlist.collaborator_ids=Array.from({length:30},(_,i)=>'member'+i);await assert.rejects(savePlaylistInvitation(f.db,'p','new',true),/30 collaborators/);
f=fixture();await Promise.all(['one','two'].map(id=>savePlaylistInvitation(f.db,'p',id,true)));assert.deepEqual([...f.playlist.collaborator_ids].sort(),['old','one','two']);
f=fixture();const p=savePlaylistInvitation(f.db,'p','new',true);assert.equal(savePlaylistInvitation(f.db,'p','new',true),p);await p;
f=fixture();f.playlist.collaborator_ids=[];let count=0;f.db.auth.me=async()=>({id:++count===1?'owner':'other'});await assert.rejects(savePlaylistInvitation(f.db,'p','new',true),/account changed/);assert.deepEqual(f.playlist.collaborator_ids,[]);
const schema=JSON.parse(fs.readFileSync('base44/entities/Playlist.jsonc','utf8'));
assert.deepEqual(schema.properties.collaborator_ids.rls.write,schema.properties.track_ids.rls.write);
assert.equal(schema.properties.collaborator_ids.maxItems,30);assert.equal(schema.properties.collaborator_ids.default,undefined,'legacy playlists remain distinguishable');
for(const key of ['creator_id','is_public','name','cover_art_url'])assert.deepEqual(schema.properties[key].rls.write,{user_condition:{role:'admin'}});
assert.equal(schema.rls.read.$or.some(rule=>rule['data.collaborator_ids']),false,'private membership reads retain server block checks');
let reads=0;
globalThis.__playlistRead={entities:{Playlist:{get:async()=>({id:'public',creator_id:'owner',is_public:true})},PlaylistCollaboration:{filter:async()=>[{id:'old',member_ids:['removed']}]}},auth:{me:async()=>({id:'removed',role:'user'})},functions:{invoke:async()=>{reads++;throw Object.assign(Error('Access removed'),{status:403});}}};
const readSource=fs.readFileSync('src/lib/collaborativePlaylists.js','utf8').replace(/^import[^;]+;/gm,'const base44=globalThis.__playlistRead;');
const {getPlaylist}=await import('data:text/javascript;base64,'+Buffer.from(readSource).toString('base64'));
const revoked=await getPlaylist('public');assert.equal(revoked.collaboration_enabled,undefined);assert.equal(reads,1,'stale legacy membership must be checked before showing edit access');
console.log('PASS native owner invitations, legacy migration, removal, lost responses, rejected writes, blocks, limits, concurrent saves, identity changes and protected fields');
