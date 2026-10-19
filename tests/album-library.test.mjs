import assert from 'node:assert/strict';
import {saveAlbumToLibrary} from '../src/lib/saveAlbumToLibrary.js';
const rows=[{id:'old',user_id:'owner',track_id:'a'}],created=[];
let fail=true;
const handler={
 filter:async query=>rows.filter(r=>r.user_id===query.user_id&&r.track_id===query.track_id),
 create:async data=>{assert.equal(data.user_id,'owner');if(data.track_id==='c'&&fail)throw Error('offline');const row={id:'save-'+data.track_id,...data};rows.push(row);created.push(data.track_id);return row;}
};
const tracks=[{id:'a'},{id:'b'},{id:'b'},{id:'c'}];
await assert.rejects(saveAlbumToLibrary(handler,'owner',tracks),/offline/);
assert.deepEqual(created,['b']);assert.equal(rows.find(r=>r.track_id==='a').id,'old');
fail=false;await saveAlbumToLibrary(handler,'owner',tracks);assert.deepEqual(created,['b','c']);
await saveAlbumToLibrary(handler,'owner',tracks);assert.deepEqual(created,['b','c']);
const cancelled=await saveAlbumToLibrary(handler,'owner',[{id:'d'}],()=>false);
assert.equal(cancelled.cancelled,true);assert.deepEqual(created,['b','c']);
let current=true;
await saveAlbumToLibrary({filter:async()=>{current=false;return [];},create:()=>{throw Error('Must not save after account change');}},'owner',[{id:'e'}],()=>current);
console.log('PASS album library saves preserve existing songs, deduplicate input, safely retry partial failures and stop on account changes');
