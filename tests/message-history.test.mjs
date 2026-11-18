import assert from 'node:assert/strict';
import {mergeEarlierMessages,mergeLatestMessages} from '../src/components/messages/messageHistory.js';
const msg=(id,n)=>({id,created_date:new Date(n*1000).toISOString()});
const older=msg('a',1),b=msg('b',2),c=msg('c',3),d=msg('d',4);
assert.deepEqual(mergeEarlierMessages([b,c],[older,b]).map(item=>item.id),['a','b','c']);
assert.deepEqual(mergeLatestMessages({messages:[older,b,c],latestIds:['b','c']},[c,d]).map(item=>item.id),['a','b','c','d']);
assert.deepEqual(mergeLatestMessages({messages:[older,b,c],latestIds:['b','c']},[b,d]).map(item=>item.id),['a','b','d'],'Deleting a message in the refreshed window removes it');
assert.deepEqual(mergeLatestMessages({messages:[older]},[]),[]);
console.log('PASS earlier history deduplicates, preserves order, survives refreshes, and respects recent deletions');
