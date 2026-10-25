import assert from 'node:assert/strict';
import {markNotificationRead,markAllNotificationsRead} from '../src/lib/notificationRead.js';
import {markArtistReleasesRead} from '../src/lib/artistReleaseRead.js';
let user={id:'owner'},notes=[],ignore=false,lost=false,writes=0,subscriptions=[{id:'sub',created_by_id:'owner',read_track_ids:[]}];
const copy=value=>structuredClone(value);
const matches=(row,q)=>Object.entries(q).every(([key,value])=>value&&typeof value==='object'&&'$lte' in value?row[key]<=value.$lte:row[key]===value);
const client={auth:{me:async()=>copy(user)},entities:{
 Notification:{get:async id=>copy(notes.find(row=>row.id===id)),filter:async q=>notes.filter(row=>matches(row,q)).slice(0,1).map(copy),updateMany:async(q,patch)=>{writes++;assert.deepEqual(patch,{$set:{read:true}});if(!ignore)notes.filter(row=>matches(row,q)).slice(0,2).forEach(row=>row.read=true);if(lost)throw Error('Response lost');return {success:true};}},
 ArtistSubscription:{get:async id=>copy(subscriptions.find(row=>row.id===id)),updateMany:async(q,patch)=>{writes++;if(!ignore){const sub=subscriptions.find(row=>row.id===q.id&&row.created_by_id===q.created_by_id);if(sub)sub.read_track_ids=[...new Set([...sub.read_track_ids,...patch.$addToSet.read_track_ids.$each])];}if(lost)throw Error('Response lost');return {success:true};}}
}};
const note=(id,user_id='owner',created_date='2026-01-01T00:00:00Z')=>({id,user_id,read:false,created_date});
notes=[note('one'),note('foreign','other')];await markNotificationRead(client,'owner','one');assert.equal(notes[0].read,true);assert.equal(notes[1].read,false);
await assert.rejects(markNotificationRead(client,'owner','foreign'),/unavailable/);
notes=[note('ignored')];ignore=true;await assert.rejects(markNotificationRead(client,'owner','ignored'),/not saved/);await assert.rejects(markAllNotificationsRead(client,'owner'),/not saved/);ignore=false;
lost=true;await markNotificationRead(client,'owner','ignored');assert.equal(notes[0].read,true);lost=false;
notes=Array.from({length:7},(_,i)=>note('n'+i));notes.push(note('foreign','other'),note('new','owner','2999-01-01T00:00:00Z'));await markAllNotificationsRead(client,'owner');assert.ok(notes.slice(0,7).every(row=>row.read));assert.ok(notes.slice(7).every(row=>!row.read));
const targets=[{subscription_id:'sub',track_id:'a'},{subscription_id:'sub',track_id:'b'},{subscription_id:'sub',track_id:'a'}];let before=writes;await markArtistReleasesRead(client,'owner',targets);assert.equal(writes-before,1);assert.deepEqual(subscriptions[0].read_track_ids,['a','b']);
ignore=true;await assert.rejects(markArtistReleasesRead(client,'owner',[{subscription_id:'sub',track_id:'c'}]),/not saved/);ignore=false;lost=true;await markArtistReleasesRead(client,'owner',[{subscription_id:'sub',track_id:'c'}]);lost=false;
subscriptions.push({id:'other-sub',created_by_id:'other',read_track_ids:[]});await assert.rejects(markArtistReleasesRead(client,'owner',[{subscription_id:'other-sub',track_id:'x'}]),/unavailable/);
user={id:'other'};before=writes;await assert.rejects(markNotificationRead(client,'owner','n0'),/account changed/);await assert.rejects(markArtistReleasesRead(client,'owner',targets),/account changed/);assert.equal(writes,before);
user={id:'owner',disabled:true};await assert.rejects(markAllNotificationsRead(client,'owner'),/account changed/);
console.log('PASS owner-only confirmed read flags, bounded batches, ignored writes, lost responses, release grouping and account isolation');
