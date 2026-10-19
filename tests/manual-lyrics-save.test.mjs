import assert from "node:assert/strict";import fs from "node:fs";
let user,track,writes,calls,ignore=false,lose=false,swap=false,deny=false;
function reset(){user={id:"admin",role:"admin"};track={id:"song",uploader_id:"owner",title:"Song",lyrics_text:"Old line",is_published:true,approval_status:"approved"};writes=[];calls=[];ignore=false;lose=false;swap=false;deny=false;}
reset();
globalThis.window={dispatchEvent(){}};
globalThis.__lyricsRaw={auth:{me:async()=>({...user})},entities:{Track:{get:async id=>{assert.equal(id,"song");return {...track};},update:async(id,patch)=>{writes.push(patch);if(deny)throw Error("Database denied");if(!ignore)Object.assign(track,patch);if(swap)user.id="other";if(lose)throw Error("Connection lost");return {...track};}}},functions:{invoke:async(name,body)=>{calls.push(body);if(body.entity==="Track"&&body.action==="update"&&user.id==="owner"){Object.assign(track,body.args[1]);return {data:{result:{...track}}};}throw Object.assign(Error("Service unavailable"),{status:402});}}};
const source=fs.readFileSync("src/api/base44Client.js","utf8").replace(/^import[^;]+;/gm,"");
const prelude="const AVATAR_PRESETS=[],savePresetAvatar=()=>{},withPresetAvatar=x=>x,createClient=()=>globalThis.__lyricsRaw,appParams={},recoveredAlbumMetadata={},recoveredAlbumResult=x=>x,withRecoveredAlbumMetadata=x=>x;";
const {base44}=await import("data:text/javascript;base64,"+Buffer.from(prelude+source).toString("base64"));
await base44.entities.Track.update("song",{lyrics_text:"First line\nSecond line"});
assert.equal(calls.length,0);assert.deepEqual(writes,[{lyrics_text:"First line\nSecond line"}]);assert.equal(track.is_published,true);
reset();await base44.entities.Track.update("song",{lyrics_text:""});assert.equal(track.lyrics_text,"");
reset();ignore=true;await assert.rejects(base44.entities.Track.update("song",{lyrics_text:"New"}),/not confirmed/);
reset();lose=true;const reconciled=await base44.entities.Track.update("song",{lyrics_text:"New"});assert.equal(reconciled.lyrics_text,"New");
reset();deny=true;await assert.rejects(base44.entities.Track.update("song",{lyrics_text:"New"}),/Database denied/);
reset();swap=true;await assert.rejects(base44.entities.Track.update("song",{lyrics_text:"New"}),/account changed/);
for(const patch of [{lyrics_text:null},{lyrics_text:"x".repeat(100001)}]){reset();await assert.rejects(base44.entities.Track.update("song",patch),/100,000/);assert.equal(writes.length,0);}
reset();user={id:"intruder",role:"user"};await assert.rejects(base44.entities.Track.update("song",{lyrics_text:"New"}),/Only the song owner/);assert.equal(writes.length,0);assert.equal(calls.length,0);
reset();user.disabled=true;await assert.rejects(base44.entities.Track.update("song",{lyrics_text:"New"}),/active account/);assert.equal(writes.length,0);
reset();user={id:"owner",role:"user"};await base44.entities.Track.update("song",{lyrics_text:"Owner line"});assert.equal(writes.length,0);assert.equal(calls[0].entity,"Track");assert.equal(track.lyrics_text,"Owner line");
reset();await assert.rejects(base44.entities.Track.update("song",{lyrics_text:"New",title:"Changed"}),/Service unavailable/);assert.equal(writes.length,0);assert.equal(calls.length,1);
const schema=JSON.parse(fs.readFileSync("base44/entities/Track.jsonc","utf8"));
assert.deepEqual(schema.rls.update,{user_condition:{role:"admin"}},"native Track write permissions must remain unchanged");
console.log("PASS admin manual lyrics without functions; confirmed persistence, clear, ignored/lost/failed writes, identity changes, limits, foreign-account denial, owner gateway and protected mixed edits");
