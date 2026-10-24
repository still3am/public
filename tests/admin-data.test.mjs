import assert from 'node:assert/strict';
import {readAdminRows,moderateAdminTrack,saveAdminReply,reviewAdminReport,suspendAdminMember} from '../src/lib/adminData.js';
let user={id:'admin',role:'admin'},writes=[],track={id:'t',artist:'Artist',genre:'Pop',cover_art_url:'cover',rights_confirmed:true},account={id:'member',is_blocked:false};
const client={auth:{me:async()=>user},entities:{
 Track:{get:async()=>track,update:async(id,patch)=>{writes.push(['track',patch]);return {...track,...patch};},updateMany:async()=>{writes.push(['hide']);}},
 User:{get:async()=>account,update:async(id,patch)=>{Object.assign(account,patch);writes.push(['account']);}},
 PublicProfile:{updateMany:async()=>{writes.push(['profile']);}},
 LoungeSession:{updateMany:async()=>{writes.push(['lounge']);}},
 SupportTicket:{update:async(id,patch)=>({id,...patch})},
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
