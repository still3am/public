import assert from 'node:assert/strict';
import fs from 'node:fs';
import {savePlaylistTracks} from '../src/lib/nativePlaylistTracks.js';
const schema=JSON.parse(fs.readFileSync('base44/entities/Playlist.jsonc','utf8'));
let user,playlist,tracks,blocks,writes,mode;
const clone=x=>structuredClone(x);
const permitted=(rule,row,who)=>typeof rule==='boolean'?rule:Object.entries(rule).every(([key,value])=>key==='$and'?value.every(r=>permitted(r,row,who)):key==='$or'?value.some(r=>permitted(r,row,who)):key==='$nor'?!value.some(r=>permitted(r,row,who)):key==='user_condition'?Object.entries(value).every(([field,v])=>who?.[field]===v):key.startsWith('data.')?row[key.slice(5)]===(value==='{{user.id}}'?who?.id:value):false);
function reset(){user={id:'owner',role:'user'};playlist={id:'p',creator_id:'owner',name:'My playlist',track_ids:['a']};tracks=[{id:'a',uploader_id:'artist',is_published:true,approval_status:'approved'},{id:'b',uploader_id:'artist',is_published:true,approval_status:'approved'},{id:'c',uploader_id:'artist',is_published:true,approval_status:'approved'}];blocks=[];writes=0;mode='ok';}
const database={auth:{me:async()=>clone(user)},entities:{Playlist:{get:async()=>clone(playlist),updateMany:async(query,patch)=>{
 writes++;if(mode==='reject')throw Object.assign(Error('Denied'),{status:403});
 assert.equal(query.creator_id,playlist.creator_id);
 assert.ok(permitted(schema.rls.update,playlist,user),'native row update must pass owner RLS');
 for(const changes of Object.values(patch))for(const key of Object.keys(changes))assert.ok(permitted(schema.properties[key].rls.write,playlist,user),'every modified field must pass FLS');
 if(query.track_ids){assert.equal(Array.isArray(query.track_ids),false,'never use match-any shorthand for order checks');if(JSON.stringify(query.track_ids.$eq)!==JSON.stringify(playlist.track_ids))return {modified_count:0};}
 if(query.updated_date&&query.updated_date!==playlist.updated_date)return {modified_count:0};
 if(patch.$addToSet)playlist.track_ids=[...new Set([...playlist.track_ids,...patch.$addToSet.track_ids.$each])];
 if(patch.$pull)playlist.track_ids=playlist.track_ids.filter(id=>!patch.$pull.track_ids.$in.includes(id));
 if(patch.$set)playlist.track_ids=[...patch.$set.track_ids];
 if(mode==='lost')throw Error('Lost response');return {modified_count:1};
}},Track:{filter:async query=>tracks.filter(t=>query.id.$in.includes(t.id)).map(clone)},Block:{filter:async()=>clone(blocks)}},functions:{invoke:()=>{throw Error('Playlist song saving must not invoke an integration function');}}};
reset();assert.deepEqual((await savePlaylistTracks(database,'p','playlistAdd',['b','b'])).track_ids,['a','b']);assert.equal(playlist.name,'My playlist');
await savePlaylistTracks(database,'p','playlistAdd',['b']);assert.deepEqual(playlist.track_ids,['a','b'],'repeated additions do not duplicate songs');
reset();await Promise.all(['b','c'].map(id=>savePlaylistTracks(database,'p','playlistAdd',[id])));assert.deepEqual([...playlist.track_ids].sort(),['a','b','c'],'concurrent additions merge atomically');
reset();mode='lost';assert.deepEqual((await savePlaylistTracks(database,'p','playlistAdd',['b'])).track_ids,['a','b'],'a lost response is reconciled against the saved playlist');
reset();mode='reject';await assert.rejects(savePlaylistTracks(database,'p','playlistAdd',['b']));assert.deepEqual(playlist.track_ids,['a']);
reset();user.id='other';await assert.rejects(savePlaylistTracks(database,'p','playlistAdd',['b']),e=>e.status===403);assert.equal(writes,0);
reset();user.disabled=true;await assert.rejects(savePlaylistTracks(database,'p','playlistAdd',['b']),e=>e.status===403);assert.equal(writes,0);
reset();blocks=[{user_id:'owner',blocked_user_id:'artist'}];await assert.rejects(savePlaylistTracks(database,'p','playlistAdd',['b']),e=>e.status===403);assert.equal(writes,0);
reset();tracks.find(t=>t.id==='b').is_published=false;await assert.rejects(savePlaylistTracks(database,'p','playlistAdd',['b']),e=>e.status===403);assert.equal(writes,0);
reset();await assert.rejects(savePlaylistTracks(database,'p','playlistAdd',['missing']),e=>e.status===403);assert.equal(writes,0);
reset();playlist.track_ids=['a','b'];await assert.rejects(savePlaylistTracks(database,'p','playlistReorder',['b','a'],['a']),e=>e.status===409);await assert.rejects(savePlaylistTracks(database,'p','playlistReorder',['a'],['a','b']),e=>e.status===400);await savePlaylistTracks(database,'p','playlistReorder',['b','a'],['a','b']);assert.deepEqual(playlist.track_ids,['b','a']);await savePlaylistTracks(database,'p','playlistRemove',['b']);assert.deepEqual(playlist.track_ids,['a']);assert.equal(tracks.length,3);
reset();for(const key of Object.keys(schema.properties))assert.equal(permitted(schema.properties[key].rls.write,playlist,user),['track_ids','collaborator_ids'].includes(key),'owners can only modify song associations and membership IDs natively');assert.equal(permitted(schema.rls.create,playlist,user),false);assert.equal(permitted(schema.rls.delete,playlist,user),false);assert.equal(permitted(schema.rls.update,playlist,{id:'other',role:'user'}),false);assert.equal(permitted(schema.rls.update,playlist,{...user,is_blocked:true}),false);
console.log('PASS integration-free native playlist adds, duplicates, concurrent saves, lost responses, denial, private/missing/blocked songs, remove/reorder and schema owner/field permissions');
