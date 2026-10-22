import assert from "node:assert/strict";
import fs from "node:fs";
import {BANNER_PRESETS,withPresetBanner,savePresetBanner} from "../src/lib/bannerPresets.js";
import {withPresetAvatar} from "../src/lib/nativeAvatar.js";
let user={id:"owner",banner_url:"uploaded.jpg"},profile={id:"public",user_id:"owner",visible:true},drop=false,lost=false;
const client={auth:{me:async()=>({...user}),updateMe:async patch=>{if(!drop)Object.assign(user,patch);if(lost)throw Error("lost response");}},entities:{PublicProfile:{filter:async()=>[{...profile}],update:async(id,patch)=>{assert.equal(id,"public");Object.assign(profile,patch);}}}};
const banner=BANNER_PRESETS[0];
const saved=await savePresetBanner(client,banner.url);
assert.equal(saved.banner_gif_url,banner.gifUrl);assert.equal(user.banner_url,"uploaded.jpg","gallery choices do not unlock arbitrary upload fields");
assert.equal(withPresetAvatar(profile).banner_url,banner.url);
assert.equal(withPresetAvatar(profile).banner_mobile_url,banner.url);
assert.equal(withPresetBanner({...profile,banner_use_default:true}).banner_url,undefined,"default banner overrides preset");
await assert.rejects(savePresetBanner(client,"https://unlisted"),/gallery/);
user.banner_preset="";drop=true;await assert.rejects(savePresetBanner(client,banner.url),/confirmed/);drop=false;
lost=true;await savePresetBanner(client,banner.url);lost=false;
assert.equal(withPresetBanner({banner_preset:"",banner_url:"custom.jpg"}).banner_url,"custom.jpg");
for(const name of ["User","PublicProfile"]){const schema=JSON.parse(fs.readFileSync("base44/entities/"+name+".jsonc","utf8"));assert.deepEqual(schema.properties.banner_preset.enum,["",...BANNER_PRESETS.map(item=>item.url)]);assert.deepEqual(schema.properties.banner_preset.rls,schema.properties.avatar_preset.rls);}
for(const item of BANNER_PRESETS){if(item.gifUrl)assert.equal(fs.readFileSync("public"+item.gifUrl).toString("ascii",0,3),"GIF");assert.equal(fs.readFileSync("public"+item.url).toString("ascii",8,12),"WEBP");}
const editor=fs.readFileSync("src/components/profile/ProfileBannerEditor.jsx","utf8");assert.ok(editor.includes("<BannerGallery"));assert.ok(editor.includes("onSelect?.(banner)"));
console.log("PASS banner gallery native save, public resolution, default recovery, uploads, failures, lost response, permissions and GIF assets");

for(const item of BANNER_PRESETS){const result=await savePresetBanner(client,item.url);assert.equal(result.banner_url,item.url);assert.equal(result.banner_gif_url,item.gifUrl||"");assert.equal(withPresetAvatar(profile).banner_url,item.url);}
assert.equal(BANNER_PRESETS.length,36);

// These source GIFs lacked repeat metadata; moonwalk also had zero frame delays.
for(const [id,frames,duration] of [["pixel-moonwalk",118,11.8],["kirby-star-ride",62,3.1]]){
 const item=BANNER_PRESETS.find(item=>item.id===id);
 assert.ok(item.gifUrl.endsWith(".loop.gif"),"fresh URL avoids stale nonlooping assets");
 const data=fs.readFileSync("public"+item.gifUrl);
 assert.ok(data.includes(Buffer.from("21ff0b4e45545343415045322e300301000000","hex")),"GIF must repeat indefinitely");
 const {inspectGif}=await import("../src/lib/profileMotion.js");
 const info=inspectGif(new Uint8Array(data),"banner");assert.equal(info.frames,frames);assert.equal(info.duration,duration);
}
console.log("PASS new GIF banners repeat with valid timing and all original frames");
