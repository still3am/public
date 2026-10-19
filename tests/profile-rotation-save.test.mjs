import assert from "node:assert/strict";
import fs from "node:fs";
import {AVATAR_PRESETS} from "../src/lib/avatarPresets.js";
import {savePresetAvatar,withPresetAvatar} from "../src/lib/nativeAvatar.js";
let user,row,writes,reads,ignored=false,publicIgnored=false;
function reset(){user={id:"owner",top_track_ids:["a","gone","b","also-gone"]};row={id:"public",user_id:"owner",visible:true,top_track_ids:[...user.top_track_ids]};writes=[];reads=[];ignored=false;publicIgnored=false;}
reset();globalThis.window={dispatchEvent(){}};
globalThis.__rotationRaw={auth:{me:async()=>structuredClone(user),updateMe:async patch=>{writes.push(patch);if(!ignored)Object.assign(user,structuredClone(patch));return structuredClone(user);}},
entities:{Track:{},PublicProfile:{filter:async()=>[structuredClone(row)],update:async(id,patch)=>{assert.equal(id,"public");if(!publicIgnored)Object.assign(row,structuredClone(patch));}}},
functions:{invoke:async(name,r)=>{if(r.entity==="Track"&&r.action==="read"){reads.push(r.args[1]);if(r.args[1]==="private")throw Object.assign(Error("Denied"),{status:403});return {data:{result:{id:r.args[1],audio_url:"https://audio.test/song"}}};}throw Error("Function unavailable");}}};
globalThis.__rotationAvatars=AVATAR_PRESETS;globalThis.__rotationSave=savePresetAvatar;globalThis.__rotationWith=withPresetAvatar;
const source=fs.readFileSync("src/api/base44Client.js","utf8").replace(/^import[^;]+;/gm,"");
const prelude="const AVATAR_PRESETS=globalThis.__rotationAvatars,savePresetAvatar=globalThis.__rotationSave,withPresetAvatar=globalThis.__rotationWith,createClient=()=>globalThis.__rotationRaw,appParams={},recoveredAlbumMetadata={},recoveredAlbumResult=value=>value,withRecoveredAlbumMetadata=value=>value;";
const {base44}=await import("data:text/javascript;base64,"+Buffer.from(prelude+source).toString("base64"));
await base44.auth.updateMe({top_track_ids:["a","b","also-gone"]});
assert.deepEqual(user.top_track_ids,["a","b","also-gone"]);assert.deepEqual(row.top_track_ids,user.top_track_ids);assert.equal(reads.length,0,"removal must not re-authorize missing retained IDs");
reset();await base44.auth.updateMe({top_track_ids:["a","new","b","also-gone"]});assert.deepEqual(reads,["new"]);assert.deepEqual(row.top_track_ids,user.top_track_ids);
reset();await base44.auth.updateMe({top_track_ids:[]});assert.deepEqual(row.top_track_ids,[]);
reset();ignored=true;await assert.rejects(base44.auth.updateMe({top_track_ids:["a"]}),/confirmed/);
reset();publicIgnored=true;await assert.rejects(base44.auth.updateMe({top_track_ids:["a"]}),/public songs were not confirmed/);
reset();await assert.rejects(base44.auth.updateMe({top_track_ids:["a","a"]}),/eight different/);assert.equal(writes.length,0);
reset();await assert.rejects(base44.auth.updateMe({top_track_ids:Array.from({length:9},(_,i)=>String(i))}),/eight different/);
reset();user.disabled=true;await assert.rejects(base44.auth.updateMe({top_track_ids:[]}),/unavailable/);assert.equal(writes.length,0);
reset();await assert.rejects(base44.auth.updateMe({top_track_ids:["private"]}),/Denied/);assert.equal(writes.length,0);
reset();await assert.rejects(base44.auth.updateMe({top_track_ids:["a"],bio:"New text"}),/Function unavailable/);assert.equal(writes.length,0);
console.log("PASS rotation removal with retained missing songs, ordered replacement, clear-all, confirmed public persistence, ignored writes, limits, suspension, track authorization and text moderation");
