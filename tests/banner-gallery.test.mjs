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
for(const item of BANNER_PRESETS.filter(item=>item.url.startsWith("/"))){if(item.gifUrl)assert.equal(fs.readFileSync("public"+item.gifUrl).toString("ascii",0,3),"GIF");assert.equal(fs.readFileSync("public"+item.url).toString("ascii",8,12),"WEBP");}
const editor=fs.readFileSync("src/components/profile/ProfileBannerEditor.jsx","utf8");assert.ok(editor.includes("<BannerGallery"));assert.ok(editor.includes("onSelect?.(banner)"));
console.log("PASS banner gallery native save, public resolution, default recovery, uploads, failures, lost response, permissions and GIF assets");

for(const item of BANNER_PRESETS){const result=await savePresetBanner(client,item.url);assert.equal(result.banner_url,item.url);assert.equal(result.banner_gif_url,item.gifUrl||"");assert.equal(withPresetAvatar(profile).banner_url,item.url);}
assert.equal(BANNER_PRESETS.length,54);
for(const item of BANNER_PRESETS.filter(item=>["852658141979006028","986992074605390852","1054546068975947980","725009240032924894","890657263823646110","940689440924747266","78039006032599533","201606520796014409"].some(id=>item.id==="pin-"+id))){assert.ok(item.url.startsWith("https://media.base44.com/"));assert.ok(item.gifUrl||item.videoUrl);assert.equal(withPresetBanner({banner_preset:item.url}).banner_video_url,item.videoUrl||"");}

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

// Gallery videos must pass the actual client save dispatch, without permitting arbitrary media.
const source=fs.readFileSync("src/api/base44Client.js","utf8");
const begin=source.indexOf("    const galleryBanner="),end=source.indexOf("    // Validated social identifiers",begin);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
let saves=0;
const dispatch=new AsyncFunction("data","BANNER_PRESETS","base44","savePresetBanner","target",source.slice(begin,end));
const existingVideo=BANNER_PRESETS.find(item=>item.videoUrl);
await dispatch({banner_url:existingVideo.url,banner_mobile_url:existingVideo.url,banner_video_url:existingVideo.videoUrl,banner_gif_url:"",banner_use_default:false},BANNER_PRESETS,{},async(client,url)=>{saves++;assert.equal(url,existingVideo.url);return {saved:true};},{});
assert.equal(saves,1,"gallery clip saves through the preset route");
await assert.rejects(dispatch({banner_url:existingVideo.url,banner_video_url:"https://unlisted.example/clip.mp4"},BANNER_PRESETS,{},async()=>{saves++;},{}),/gallery banner/);
assert.equal(saves,1,"unlisted media never bypasses the protected upload path");
const added=BANNER_PRESETS.filter(item=>["431430839295075315","590675307396485707","1087830484963583904","775111785907189689","831899362434343112","642677809369761874","62346776087723715","1147714286316835382"].some(id=>item.id==="pin-"+id));
assert.equal(added.length,8);assert.equal(added.filter(item=>item.gifUrl).length,1);assert.equal(added.filter(item=>item.videoUrl).length,2);
for(const item of added){assert.ok(item.url.startsWith("https://media.base44.com/"));const resolved=withPresetBanner({banner_preset:item.url});assert.equal(resolved.banner_video_url,item.videoUrl||"");assert.equal(resolved.banner_gif_url,item.gifUrl||"");}
console.log("PASS eight new hosted banners and validated gallery video saves");
