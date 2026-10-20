import assert from 'node:assert/strict';
import {placePlaylistSong,savePlaylistMove} from '../src/lib/playlistOrder.js';
assert.deepEqual(placePlaylistSong(['a','b','c','d'],'a','c',true),['b','c','a','d']);
assert.deepEqual(placePlaylistSong(['a','b','c','d'],'d','b',false),['a','d','b','c']);
assert.deepEqual(placePlaylistSong(['a','hidden','b','a','c'],'a','c',true),['hidden','b','c','a','a']);
assert.throws(()=>placePlaylistSong(['a'],'a','deleted'),e=>e.status===409);
let current={id:'p',track_ids:['a','b','c']},writes=0;
const deps={load:async()=>structuredClone(current),save:async(next,expected)=>{
 writes++;
 if(writes===1){current.track_ids=['a','remote-add','b','c'];throw Object.assign(Error('Conflict'),{status:409});}
 assert.deepEqual(expected,current.track_ids);current={...current,track_ids:next};return current;
}};
assert.deepEqual((await savePlaylistMove(deps,'a','c',true)).track_ids,['remote-add','b','c','a']);
assert.equal(writes,2,'rebase a move without losing concurrent additions');
writes=0;
await savePlaylistMove({load:async()=>({track_ids:['a','b']}),save:async()=>{writes++;throw Object.assign(Error('Denied'),{status:403});}},'a','b',true).then(()=>assert.fail(),e=>assert.equal(e.status,403));
assert.equal(writes,1,'permission failures are not retried');
writes=0;
await assert.rejects(savePlaylistMove({load:async()=>({track_ids:['a','b']}),save:async()=>{writes++;throw Object.assign(Error('Conflict'),{status:409});}},'a','b',true));
assert.equal(writes,3,'conflict retries have a fixed limit');
console.log('PASS forward/backward drag, hidden and duplicate IDs, deleted targets, concurrent adds, denial and bounded conflict retries');
