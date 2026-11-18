import assert from 'node:assert/strict';
import {messageRunPosition} from '../src/components/messages/messageRuns.js';
const rows=[
 {sender_id:'a',created_date:'2026-11-18T10:00:00Z'},
 {sender_id:'a',created_date:'2026-11-18T10:01:00Z'},
 {sender_id:'b',created_date:'2026-11-18T10:02:00Z'},
 {sender_id:'b',created_date:'2026-11-18T10:10:00Z'},
];
assert.deepEqual(messageRunPosition(rows,0),{start:true,end:false});
assert.deepEqual(messageRunPosition(rows,1),{start:false,end:true});
assert.deepEqual(messageRunPosition(rows,2),{start:true,end:true});
assert.deepEqual(messageRunPosition(rows,3),{start:true,end:true});
assert.deepEqual(messageRunPosition([{sender_id:'a'}],0),{start:true,end:true});
console.log('PASS sender names start each run; portraits end it; sender changes and time gaps split runs');
