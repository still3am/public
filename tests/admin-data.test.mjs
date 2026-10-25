import assert from 'node:assert/strict';
import {readAdminRows,moderateAdminTrack,saveAdminReply,reviewAdminReport,suspendAdminMember,setAdminSuggestionStatus} from '../src/lib/adminData.js';
let user={id:'admin',role:'admin'},writes=[],track={id:'t',artist:'Artist',genre:'Pop',cover_art_url:'cover',rights_confirmed:true},account={id:'member',is_blocked:false};
const client={auth:{me:async()=>user},entities:{
 Track:{get:async()=>track,update:async(id,patch)=>{writes.push(['track',patch]);return {...track,...patch};},updateMany:async()=>{writes.push(['hide']);}},
 User:{get:async()=>account,update:async(id,patch)=>{Object.assign(account,patch);writes.push(['account']);}},
 PublicProfile:{updateMany:async()=>{writes.push(['profile']);}},
 LoungeSession:{updateMany:async()=>{writes.push(['lounge']);}},
 SupportTicket:{get:async()=>({id:'ticket'}),update:async(id,patch)=>({id,...patch})},
 Report:{filter:async(q,sort,limit,skip)=>skip?[]:Array.from({length:100},(_,i)=>({id:String(i)})),update:async(id,patch)=>({id,...patch})}
}};
assert.equal((await readAdminRows(client,'Report')).length,100);
assert.equal((await moderateAdminTrack(client,'t','approved')).is_published,true);
track.rights_confirmed=false;await assert.rejects(moderateAdminTrack(client,'t','approved'),/rights/);
assert.equal((await saveAdminReply(client,'ticket','Hello')).status,'answered');
await reviewAdminReport(client,{id:'report',target_type:'track',target_id:'t'},true);
assert.equal(writes.at(-1)[1].approval_status,'rejected');
await suspendAdminMember(client,'member',true);assert.equal(account.is_blocked,true);assert.ok(writes.some(w=>w[0]==='lounge'));
await assert.rejects(suspendAdminMember(client,'admin',true),/own account/);
user={role:'user'};const before=writes.length;await assert.rejects(moderateAdminTrack(client,'t','rejected'),/Administrator/);await assert.rejects(readAdminRows(client,'Report'),/Administrator/);assert.equal(writes.length,before);
console.log('PASS admin authorization, complete list reads, rights validation, release changes, replies, report moderation and suspension cleanup');

user={id:'admin',role:'admin'};
const notes=[];let failNotice=true;
client.entities.Suggestion={update:async(id,patch)=>({id,...patch,user_id:'member',title:'Better music',voter_ids:['member','fan','fan']})};
client.entities.User.get=async id=>({id});
client.entities.Notification={filter:async query=>notes.filter(n=>n.user_id===query.user_id&&n.source_key===query.source_key),create:async value=>{if(failNotice&&value.user_id==='fan')throw Error('Delivery unavailable');notes.push(value);return {id:'n'+notes.length,...value};}};
assert.equal((await setAdminSuggestionStatus(client,'idea','planned')).notificationPending,false);assert.equal(notes.length,0);
assert.equal((await setAdminSuggestionStatus(client,'idea','done')).notificationPending,true);assert.equal(notes.length,1);
failNotice=false;assert.equal((await setAdminSuggestionStatus(client,'idea','done')).notificationPending,false);
await setAdminSuggestionStatus(client,'idea','done');assert.equal(notes.length,2);assert.deepEqual(notes.map(n=>n.user_id).sort(),['fan','member']);
assert.ok(notes.every(n=>n.target_path==='/suggestions?idea=idea'));
user={role:'user'};await assert.rejects(setAdminSuggestionStatus(client,'idea','done'),/Administrator/);
console.log('PASS native admin completion notifications preserve recipients and retry without duplicates');
