import assert from "node:assert/strict";
import fs from "node:fs";
import {AVATAR_PRESETS} from "../src/lib/avatarPresets.js";
import {savePresetAvatar,withPresetAvatar} from "../src/lib/nativeAvatar.js";
globalThis.window={dispatchEvent(){}};
let user,profile,requests,nativeWrites,failText=false,ignoreAvatar=false,switchAccount=false;
function reset(){user={id:"listener",display_name:"Old name",bio:"",avatar_url:"https://old.test/photo"};profile={id:"public-profile",user_id:user.id,visible:true};requests=[];nativeWrites=[];failText=false;ignoreAvatar=false;switchAccount=false;}
reset();
globalThis.__raw={
 auth:{me:async()=>({...user}),updateMe:async data=>{nativeWrites.push(data);if(!ignoreAvatar)Object.assign(user,data);return {...user};}},
 entities:{PublicProfile:{filter:async()=>[{...profile}],update:async(id,data)=>{assert.equal(id,profile.id);Object.assign(profile,data);}}},
 functions:{invoke:async(name,request)=>{assert.equal(name,"securityGateway");requests.push(request);const [id,data]=request.args;assert.equal(id,user.id);if(failText)throw Error("Text rejected");assert.ok(!Object.hasOwn(data,"avatar_url"),"gallery URL must never reach the upload/moderation route");Object.assign(user,data);if(switchAccount)user.id="other";return {data:{result:{...user}}};}}
};
globalThis.__avatars=AVATAR_PRESETS;globalThis.__savePreset=savePresetAvatar;globalThis.__withPreset=withPresetAvatar;
const source=fs.readFileSync("src/api/base44Client.js","utf8").replace(/^import[^;]+;/gm,"");
const prelude="const AVATAR_PRESETS=globalThis.__avatars,savePresetAvatar=globalThis.__savePreset,withPresetAvatar=globalThis.__withPreset,createClient=()=>globalThis.__raw,appParams={};";
const {base44}=await import("data:text/javascript;base64,"+Buffer.from(prelude+source).toString("base64"));
for(const avatar of AVATAR_PRESETS){
 reset();const saved=await base44.auth.updateMe({display_name:"New name",bio:"My music",avatar_url:avatar.url});
 assert.equal(saved.avatar_url,avatar.url);assert.equal(saved.display_name,"New name");assert.equal(profile.avatar_preset,avatar.url);
 assert.deepEqual(requests[0].args[1],{display_name:"New name",bio:"My music"});
 assert.deepEqual(nativeWrites,[{avatar_preset:avatar.url}]);assert.equal((await base44.auth.me()).avatar_url,avatar.url);
}
reset();await base44.auth.updateMe({avatar_url:AVATAR_PRESETS[0].url});assert.equal(requests.length,0);
reset();await base44.auth.updateMe({bio:"Updated",avatar_url:""});assert.equal(user.avatar_preset,"initials");assert.equal((await base44.auth.me()).avatar_url,"");
reset();failText=true;await assert.rejects(base44.auth.updateMe({bio:"Rejected",avatar_url:AVATAR_PRESETS[0].url}),/Text rejected/);assert.equal(nativeWrites.length,0);
reset();ignoreAvatar=true;await assert.rejects(base44.auth.updateMe({avatar_url:AVATAR_PRESETS[0].url}),/confirmed/);
reset();switchAccount=true;await assert.rejects(base44.auth.updateMe({bio:"Updated",avatar_url:AVATAR_PRESETS[0].url}),/account changed/);assert.equal(nativeWrites.length,0);
console.log("PASS all gallery avatars save alongside profile edits, public persistence, removal, moderation failures, ignored writes and account changes");
