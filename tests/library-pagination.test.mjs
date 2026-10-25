import assert from 'node:assert/strict';
import {readLibraryRows} from '../src/lib/libraryRows.js';
const all=Array.from({length:1205},(_,i)=>({id:String(i),track_id:'song'+i}));let calls=0;
const handler={filter:async(q,sort,limit,skip)=>{calls++;assert.equal(q.user_id,'owner');assert.equal(sort,'id');return all.slice(skip,skip+limit);}};
assert.equal((await readLibraryRows(handler,{user_id:'owner'})).length,1205);assert.equal(calls,3);
calls=0;assert.equal((await readLibraryRows(handler,{user_id:'owner'},{one:true})).length,1);assert.equal(calls,1);
calls=0;await assert.rejects(readLibraryRows({filter:async()=>{calls++;return all.slice(0,500);}},{user_id:'owner'}),/stalled/);assert.equal(calls,2);
await assert.rejects(readLibraryRows({filter:async()=>({unexpected:true})},{user_id:'owner'}),/could not be read/);
console.log('PASS complete library pagination and early stalled-page failure without a request storm');
