import assert from "node:assert/strict";
import fs from "node:fs";
import {savePresetAvatar,withPresetAvatar,PRESET_AVATAR_VALUES} from "../src/lib/nativeAvatar.js";
import {AVATAR_PRESETS} from "../src/lib/avatarPresets.js";
let user={id:"me",avatar_url:"https://old/photo"},profile={id:"profile",user_id:"me",visible:true},drop=false,lost=false;
const client={auth:{me:async()=>({...user}),updateMe:async patch=>{if(!drop)Object.assign(user,patch);if(lost)throw Error("lost response");}},entities:{PublicProfile:{filter:async()=>[{...profile}],update:async(id,patch)=>{assert.equal(id,"profile");Object.assign(profile,patch);}}},functions:{invoke:()=>{throw Error("Integration must never be called");}}};
const selected=AVATAR_PRESETS[0].url;
let saved=await savePresetAvatar(client,selected);
assert.equal(saved.avatar_url,selected);assert.equal(profile.avatar_preset,selected);assert.equal(user.avatar_url,"https://old/photo","native preset does not unlock arbitrary upload URLs");
assert.equal(withPresetAvatar(profile).avatar_url,selected,"other viewers resolve the public preset");
await assert.rejects(savePresetAvatar(client,"https://unlisted/image"),/built-in/);
drop=true;await assert.rejects(savePresetAvatar(client,AVATAR_PRESETS[1].url),/confirmed/);drop=false;
lost=true;saved=await savePresetAvatar(client,AVATAR_PRESETS[1].url);assert.equal(saved.avatar_url,AVATAR_PRESETS[1].url);lost=false;
saved=await savePresetAvatar(client,"");assert.equal(saved.avatar_url,"");assert.equal(withPresetAvatar(profile).avatar_url,"");
assert.equal(withPresetAvatar({avatar_url:"https://uploaded",avatar_preset:""}).avatar_url,"https://uploaded","uploaded photo works after clearing the preset");
for(const name of ["User","PublicProfile"]){const props=JSON.parse(fs.readFileSync("base44/entities/"+name+".jsonc","utf8")).properties;assert.deepEqual(props.avatar_preset.enum,PRESET_AVATAR_VALUES);}
assert.equal(JSON.parse(fs.readFileSync("base44/entities/User.jsonc","utf8")).properties.avatar_url.rls.write,false);
console.log("PASS preset saves without integration calls, public reloads, strict gallery values, lost-response recovery, unconfirmed-write rejection, initials and upload restoration");
