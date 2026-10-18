import assert from "node:assert/strict";
import fs from "node:fs";
import {NOTE_EMOJIS,NOTE_EMOJI_VALUES} from "../src/lib/noteEmojis.js";
import {savePublicNote,requestPublicNote} from "../src/lib/publicNoteActions.js";
let user={id:"me"},blocked=false,published=true,drop=false,lost=false,calls=0,backendMode="credits";
let row={id:"profile",user_id:"me",visible:true,updated_date:new Date().toISOString()};
const copy=x=>structuredClone(x);
const db={auth:{me:async()=>copy(user)},entities:{
 PublicProfile:{filter:async q=>q.user_id===row.user_id&&row.visible?[copy(row)]:[],update:async(id,data)=>{
   assert.equal(id,"profile");assert.equal(user.id,row.user_id);if(drop)return {};
   Object.assign(row,copy(data),{updated_date:new Date().toISOString()});if(lost)throw Error("response lost");return copy(row);
 }},
 Block:{filter:async()=>blocked?[{user_id:"me",blocked_user_id:"other"}]:[]},
 Track:{filter:async q=>published&&q.is_published===true&&q.approval_status==="approved"?[{id:q.id,title:"Song",uploader_id:"other",audio_url:"https://audio",audio_file_uri:"secret",is_published:true,approval_status:"approved"}]:[]}
}};
const client={functions:{invoke:async(_name,body)=>{
 calls++;if(backendMode==="credits")throw {response:{status:402}};
 return {data:{result:{id:"text-note",user_id:"me",caption:body.action==="readNote"?"Text":"Text",track_id:"",expires_at:new Date(Date.now()+86400000).toISOString()}}};
}}};
let note=await savePublicNote(client,"me",{track_id:"song",caption:""},db);
assert.equal(note.track_id,"song");assert.equal(calls,0,"song save never calls a backend function/integration");
assert.equal(note.track.audio_file_uri,undefined,"private file identifiers are not exposed");
assert.equal((await requestPublicNote(client,"readNote",["me"],db)).id,"native:profile");
assert.equal(calls,0,"native note reloads across sessions without integration calls");
await savePublicNote(client,"me",{track_id:"song",appearance:"cover_flow"},db);
assert.equal((await requestPublicNote(client,"readNote",["me"],db)).appearance,"cover_flow","cover animation choice survives a database reload");
assert.equal(calls,0,"cover-style song notes still avoid integrations");
await savePublicNote(client,"me",{track_id:"song",emoji:"😶‍🌫️"},db);
assert.equal((await requestPublicNote(client,"readNote",["me"],db)).emoji,"😶‍🌫️","multi-codepoint emoji badge survives reload");
assert.equal(calls,0,"emoji badges require no integration call");
await assert.rejects(savePublicNote(client,"me",{track_id:"song",emoji:"arbitrary text"},db),/picker/);
await savePublicNote(client,"me",{track_id:"song",emoji:""},db);
assert.equal((await requestPublicNote(client,"readNote",["me"],db)).emoji,"","emoji can be removed");
for(const emoji of ["🇩🇴","👨‍👩‍👧‍👦","👍🏽","🍕","🦋"]){
 await savePublicNote(client,"me",{track_id:"song",emoji},db);
 assert.equal((await requestPublicNote(client,"readNote",["me"],db)).emoji,emoji);
}
assert.equal(calls,0,"full catalog notes still use no integrations");
assert.ok(NOTE_EMOJIS.length>3900);
for(const path of ["base44/entities/PublicNote.jsonc","base44/entities/PublicProfile.jsonc"]){
 const props=JSON.parse(fs.readFileSync(path,"utf8")).properties;
 assert.deepEqual((props.public_song_note?.properties||props).emoji.enum,NOTE_EMOJI_VALUES,"schema accepts every catalog emoji");
}
await requestPublicNote(client,"removeNote",["me"],db);
assert.equal(await requestPublicNote(client,"readNote",["me"],db),null);
assert.equal(row.public_song_note.mode,"none","removal masks an older gateway note so it cannot reappear");
lost=true;note=await savePublicNote(client,"me",{track_id:"song",caption:""},db);assert.equal(note.track_id,"song","database write is confirmed despite response loss");lost=false;
user={id:"another"};await assert.rejects(savePublicNote(client,"me",{track_id:"song"},db),/account changed/);user={id:"me"};
published=false;await assert.rejects(savePublicNote(client,"me",{track_id:"private"},db),/published song/);published=true;
blocked=true;assert.equal(await requestPublicNote(client,"readNote",["me"],db),null,"blocked uploaders are hidden");
await assert.rejects(savePublicNote(client,"me",{track_id:"song"},db),/unavailable/);blocked=false;
drop=true;await assert.rejects(savePublicNote(client,"me",{track_id:"different"},db),/not confirmed/);drop=false;
row.public_song_note.expires_at="2099-01-01T00:00:00.000Z";row.updated_date=new Date(Date.now()-2*86400000).toISOString();
assert.equal(await requestPublicNote(client,"readNote",["me"],db),null,"expiry is bounded by database time");
backendMode="working";await savePublicNote(client,"me",{caption:"Text"},db);assert.equal(row.public_song_note.mode,"server","text save replaces native song source");
assert.equal((await requestPublicNote(client,"readNote",["me"],db)).caption,"Text");
const schema=JSON.parse(fs.readFileSync("base44/entities/PublicProfile.jsonc","utf8")).properties.public_song_note;
assert.equal(schema.additionalProperties,false);assert.equal(schema.properties.caption,undefined,"native field cannot publish unreviewed text");
assert.ok(schema.rls.write.$or.some(rule=>rule["data.user_id"]==="{{user.id}}"));
console.log("PASS native song-note save/read/remove with unavailable integrations, response recovery, ownership, blocks, published-song checks, database confirmation, server-bounded expiry and text-source replacement");
