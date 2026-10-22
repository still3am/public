import {BANNER_PRESETS,savePresetBanner} from "../src/lib/bannerPresets.js";
globalThis.BANNER_PRESETS=BANNER_PRESETS;globalThis.savePresetBanner=savePresetBanner;
import assert from "node:assert/strict";
import fs from "node:fs";
let user,profile,writes,mode;
function reset(){user={id:"member",instagram:"",twitter:"",website:"",soundcloud:""};profile={id:"mirror",user_id:"member",visible:true,...user};profile.id="mirror";writes=[];mode="";}
reset();
const raw={
 auth:{me:async()=>({...user}),updateMe:async patch=>{writes.push(["account",patch]);if(mode!=="ignore-account")Object.assign(user,patch);if(mode==="switch")user.id="other";if(mode==="lost-account")throw Error("Lost response");return {...user};}},
 entities:{Track:{filter:async()=>[{id:"song"}]},PublicProfile:{
  filter:async()=>({items:[{...profile}]}),
  update:async(id,patch)=>{assert.equal(id,"mirror");writes.push(["public",patch]);if(mode!=="ignore-mirror")Object.assign(profile,patch);if(mode==="lost-mirror")throw Error("Lost response");}
 }},
 functions:{invoke:async()=>{throw Object.assign(Error("Service unavailable"),{status:402});}}
};
globalThis.__linkClient=raw;
const source=fs.readFileSync("src/api/base44Client.js","utf8").replace(/^import[^;]+;/gm,"");
const prelude="const createClient=()=>globalThis.__linkClient,appParams={},AVATAR_PRESETS=[],withPresetAvatar=value=>value,entityRows=page=>Array.isArray(page)?page:page?.items;";
const {base44,saveProfileLinks}=await import("data:text/javascript;base64,"+Buffer.from(prelude+source).toString("base64"));
await base44.auth.updateMe({instagram:"_still3am"});
assert.equal(user.instagram,"_still3am");assert.equal(profile.instagram,"_still3am");
assert.equal(writes.length,2,"social links save despite unavailable backend");
reset();await saveProfileLinks(raw,"member",{instagram:" @name ",twitter:"@handle",website:"example.com",soundcloud:"https://soundcloud.com/person"});
assert.equal(user.instagram,"name");assert.equal(profile.twitter,"handle");assert.equal(user.website,"https://example.com/");
for(const patch of [{website:"javascript:alert(1)"},{website:"https://name:secret@example.com"},{instagram:"bad handle"},{instagram:"x".repeat(101)},{bio:"unsupported"},{website:42}]){
 reset();await assert.rejects(saveProfileLinks(raw,"member",patch));assert.equal(writes.length,0);
}
reset();mode="ignore-account";await assert.rejects(saveProfileLinks(raw,"member",{instagram:"name"}),/not confirmed/);assert.equal(writes.some(([stage])=>stage==="public"),false);
reset();mode="ignore-mirror";await assert.rejects(saveProfileLinks(raw,"member",{instagram:"name"}),/not confirmed/);
mode="";await saveProfileLinks(raw,"member",{instagram:"name"});assert.equal(profile.instagram,"name","retry repairs public mirror after partial failure");
for(const lost of ["lost-account","lost-mirror"]){reset();mode=lost;await saveProfileLinks(raw,"member",{instagram:"name"});assert.equal(profile.instagram,"name");}
reset();mode="switch";await assert.rejects(saveProfileLinks(raw,"member",{instagram:"name"}),/account changed/);assert.equal(writes.some(([stage])=>stage==="public"),false);
reset();user.disabled=true;await assert.rejects(saveProfileLinks(raw,"member",{instagram:"name"}));assert.equal(writes.length,0);
reset();await assert.rejects(base44.auth.updateMe({instagram:"name",bio:"changed"}),/Service unavailable/);assert.equal(writes.length,0,"moderation failures cannot silently save a mixed draft");
reset();await base44.auth.updateMe({instagram:"name",featured_track_id:"song"});assert.equal(user.featured_track_id,"song");assert.equal(profile.instagram,"name");
reset();await saveProfileLinks(raw,"member",{instagram:""});assert.equal(profile.instagram,"","clearing a handle is saved publicly");
for(const entity of ["User","PublicProfile"]){
 const schema=JSON.parse(fs.readFileSync("base44/entities/"+entity+".jsonc","utf8"));
 for(const key of ["instagram","twitter","website","soundcloud"]){const field=schema.properties[key];assert.ok(field.pattern);assert.ok(field.maxLength);if(entity==="PublicProfile")assert.ok(JSON.stringify(field.rls.write).includes("data.user_id"));}
 if(entity==="User")assert.equal(schema.properties.bio.rls.write,false,"free text still requires moderation");
}
console.log("PASS social links without functions, validation, public visibility, ignored/lost writes, retry, account isolation and retained moderation");
