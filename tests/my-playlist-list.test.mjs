import assert from 'node:assert/strict';
import {loadMyPlaylistList} from '../src/lib/myPlaylistList.js';
let fail=false,legacyFail=false,reads=[];
const client={entities:{Playlist:{filter:async query=>{assert.equal(query.creator_id,'listener');return [{id:'owned',creator_id:'listener'}];}},PlaylistCollaboration:{filter:async()=>{if(legacyFail)throw Error('Unavailable');return [{playlist_id:'missing'},{playlist_id:'revoked'},{playlist_id:'shared'}];}}},functions:{invoke:async(name,body)=>{assert.equal(body.action,'collaborationList');assert.deepEqual(body.args,[]);if(fail)throw Error('Service unavailable');return {data:{result:[{id:'new-invitation',creator_id:'owner'}]}};}}};
const read=async id=>{reads.push(id);if(id==='missing')throw Object.assign(Error('Deleted'),{status:404});return {id,creator_id:'owner',collaborator_ids:id==='revoked'?[]:['listener']};};
let result=await loadMyPlaylistList(client,'listener',read);assert.deepEqual(result.rows.map(p=>p.id),['owned','new-invitation']);assert.equal(result.partial,false);assert.deepEqual(reads,[]);
fail=true;result=await loadMyPlaylistList(client,'listener',read);assert.deepEqual(result.rows.map(p=>p.id),['owned','shared']);assert.equal(result.partial,true);
legacyFail=true;result=await loadMyPlaylistList(client,'listener',read);assert.deepEqual(result.rows.map(p=>p.id),['owned']);assert.equal(result.partial,true);
console.log('PASS canonical shared playlists, isolated obsolete invites and partial failures preserve owned playlists');
