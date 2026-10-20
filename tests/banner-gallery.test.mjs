import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BANNER_PRESETS,savePresetBanner,withPresetBanner} from "../src/lib/bannerPresets.js";
function fixture(options={}){
 let user={id:"owner",banner_url:"https://example.test/old.jpg",banner_gif_url:"https://example.test/old.gif",...options.user};
 let profile={id:"public-owner",user_id:"owner",visible:true};
 const client={auth:{me:async()=>({...user}),updateMe:async patch=>{if(!options.rejectUser)user={...user,...patch};}},
 entities:{PublicProfile:{filter:async()=>options.missing?[]:[{...profile}],update:async(id,patch)=>{assert.equal(id,"public-owner");if(!options.rejectMirror)profile={...profile,...patch};}}}};
 return {client,get user(){return user;},get profile(){return profile;}};
}
for(const preset of BANNER_PRESETS){
 const f=fixture();const saved=await savePresetBanner(f.client,preset.url);
 assert.equal(saved.banner_url,preset.url);assert.equal(saved.banner_gif_url,"");assert.equal(saved.banner_video_url,"");assert.equal(saved.banner_use_default,false);
 assert.equal(f.profile.banner_preset,preset.url);
 assert.match(readFileSync(new URL("../public"+preset.url,import.meta.url),"utf8"),/<svg/);
}
for(const options of [{user:{id:""}},{user:{disabled:true}},{user:{is_blocked:true}},{missing:true},{rejectUser:true},{rejectMirror:true}]){
 await assert.rejects(()=>savePresetBanner(fixture(options).client,BANNER_PRESETS[0].url));
}
await assert.rejects(()=>savePresetBanner(fixture().client,"https://example.test/unapproved.gif"),/built-in/);
assert.equal(withPresetBanner({banner_url:"custom",banner_preset:""}).banner_url,"custom");
assert.equal(withPresetBanner({banner_url:"custom",banner_preset:"unknown"}).banner_url,"custom");
const defaultBanner=withPresetBanner({banner_preset:BANNER_PRESETS[0].url,banner_use_default:true});
assert.equal(defaultBanner.banner_use_default,true);
for(const name of ["User","PublicProfile"]){
 const schema=JSON.parse(readFileSync(new URL("../base44/entities/"+name+".jsonc",import.meta.url),"utf8"));
 assert.deepEqual(schema.properties.banner_preset.enum,["",...BANNER_PRESETS.map(p=>p.url)]);
}
