import assert from "node:assert/strict";
import fs from "node:fs";
import {saveTimedLyrics,validateTimedLyrics} from "../src/lib/saveTimedLyrics.js";
import {loungeAction} from "../src/lib/adminLounge.js";
const clone = value => structuredClone(value);
let user,db,writes,calls,ignore,lost,swap;
function reset() {
  user={id:"admin",role:"admin",display_name:"Listener"};
  db={Track:[{id:"song",uploader_id:"owner",is_published:true,approval_status:"approved",title:"Song",audio_url:"https://example.test/song.mp3"}],Lyrics:[],LoungeSession:[],LoungeMember:[],LoungeQueueItem:[]};
  writes=[];calls=[];ignore=false;lost=false;swap=false;
}
const client={auth:{me:async()=>clone(user)},entities:new Proxy({},{get:(_,name)=>({
  get:async id=>{const row=db[name].find(row=>row.id===id);if(!row)throw Error("Not found");return clone(row);},
  filter:async query=>clone(db[name].filter(row=>Object.entries(query).every(([key,value])=>row[key]===value))),
  list:async()=>clone(db[name]),
  create:async data=>{const row={id:name+"-"+(db[name].length+1),...clone(data)};writes.push([name,"create",clone(data)]);if(!ignore)db[name].push(row);if(swap)user.id="switched";if(lost)throw Error("Lost response");return clone(row);},
  update:async(id,data)=>{const row=db[name].find(row=>row.id===id);writes.push([name,"update",clone(data)]);if(!ignore)Object.assign(row,clone(data));if(swap)user.id="switched";if(lost)throw Error("Lost response");return clone(row);},
  delete:async id=>{db[name]=db[name].filter(row=>row.id!==id);return {id};}
})})};
const protectedWrite=async(...args)=>{calls.push(args);throw Object.assign(Error("Service unavailable"),{status:402});};
const lines=[{text:"First line",start_time_ms:0,end_time_ms:1000},{text:"Second line",start_time_ms:1000,end_time_ms:2000,words:[{text:"Second",start_time_ms:1000,end_time_ms:1500},{text:"line",start_time_ms:1500,end_time_ms:2000}]}];
const save=input=>saveTimedLyrics(client,{trackId:"song",lines,...input},protectedWrite);
reset();let saved=await save();assert.equal(saved.lines.length,2);assert.equal(calls.length,0);assert.equal(db.Lyrics.length,1);
await save();assert.equal(db.Lyrics.length,1,"reopened sync edits update the same record");
reset();lost=true;saved=await save();assert.equal(saved.lines[0].text,"First line");assert.equal(db.Lyrics.length,1,"lost create response is reconciled without duplicates");
reset();ignore=true;await assert.rejects(save(),/not (?:be )?confirmed/);
reset();swap=true;await assert.rejects(save(),/account changed/);
reset();user.role="user";user.id="owner";await assert.rejects(save(),/Service unavailable/);assert.equal(writes.length,0);assert.equal(calls[0][0],"create");
reset();user.role="user";user.id="intruder";await assert.rejects(save(),/Only the song owner/);assert.equal(calls.length,0);
for(const malformed of [[],[{text:"Bad",start_time_ms:NaN,end_time_ms:1000}],[{text:"Bad",start_time_ms:1000,end_time_ms:0}],[{text:"Bad",start_time_ms:0,end_time_ms:100,words:[{text:"Bad",start_time_ms:0,end_time_ms:101}]}]])assert.throws(()=>validateTimedLyrics(malformed));
reset();db.Lyrics.push({id:"foreign-lyrics",track_id:"another",uploader_id:"owner"});await assert.rejects(save({recordId:"foreign-lyrics"}),/another song/);

const act=(entity,method,...args)=>loungeAction(client,entity,method,args,()=>protectedWrite(entity,method,args));
reset();let room=await act("LoungeSession","create",{code:"ABCDE",host_id:"spoofed",is_active:true,current_track_id:"",position_seconds:0,is_playing:false,sync_anchor_at:new Date().toISOString()});
assert.equal(room.host_id,"admin");assert.equal(calls.length,0);
let member=await act("LoungeMember","create",{session_id:room.id,user_id:"spoofed",status:"pending",role:"guest"});assert.equal(member.user_id,"admin");assert.equal(member.status,"approved");
await act("LoungeMember","create",{session_id:room.id});assert.equal(db.LoungeMember.length,1);
room=await act("LoungeSession","update",room.id,{current_track_id:"song",current_track:"forged"});assert.equal(JSON.parse(room.current_track).id,"song");
assert.equal((await act("LoungeSession","filter",{host_id:"admin",is_active:true})).length,1);
await act("LoungeSession","update",room.id,{is_active:false});assert.equal(db.LoungeSession[0].is_active,false);
reset();lost=true;room=await act("LoungeSession","create",{code:"ABCDE",is_active:true});assert.ok(room.id);assert.equal(db.LoungeSession.length,1);
reset();ignore=true;await assert.rejects(act("LoungeSession","create",{code:"ABCDE",is_active:true}),/not (?:be )?confirmed/);
reset();user.role="user";await assert.rejects(act("LoungeSession","create",{code:"ABCDE"}),/Service unavailable/);assert.equal(writes.length,0);
reset();db.LoungeSession=[{id:"foreign",host_id:"other",is_active:true}];await assert.rejects(act("LoungeSession","update","foreign",{is_active:false}),/Service unavailable/);assert.equal(writes.length,0);
reset();user.disabled=true;await assert.rejects(act("LoungeSession","create",{code:"ABCDE"}),/active account/);
for(const name of ["Lyrics","LoungeSession","LoungeMember","LoungeQueueItem"]){const schema=JSON.parse(fs.readFileSync("base44/entities/"+name+".jsonc","utf8"));assert.deepEqual(schema.rls.create,{user_condition:{role:"admin"}});}
console.log("PASS synced line/word persistence, duplicate/lost/ignored writes, identity changes, owner server checks, invalid timings; admin lounge start/read/host membership/playback/end with functions unavailable; guest and foreign-room protections; unchanged native permissions");
