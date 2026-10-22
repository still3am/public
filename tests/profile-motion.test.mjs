import assert from "node:assert/strict";
import fs from "node:fs";
import {isMotionFile,validateMotionFile,inspectGif,validateMotionDuration,profileMotionSeconds,PROFILE_VIDEO_BYTES,PROFILE_GIF_BYTES} from "../src/lib/profileMotion.js";
import {withPresetAvatar} from "../src/lib/nativeAvatar.js";
import {AVATAR_PRESETS} from "../src/lib/avatarPresets.js";
assert.equal(isMotionFile({name:"photo.png",type:"image/png"}),false);
for(const type of ["video/mp4","video/webm","video/quicktime"])assert.equal(validateMotionFile({name:"clip",type,size:100}),"video");
assert.equal(validateMotionFile({name:"clip.MOV",type:"",size:100}),"video");
assert.equal(validateMotionFile({name:"loop.gif",type:"image/gif",size:100}),"gif");
for(const file of [{name:"loop.gif",type:"image/gif",size:PROFILE_GIF_BYTES+1},{name:"clip.mp4",type:"video/mp4",size:PROFILE_VIDEO_BYTES+1},{name:"document.txt",type:"text/plain",size:100},{name:"clip.mp4",type:"video/mp4",size:0}])assert.throws(()=>validateMotionFile(file));
const gif=Uint8Array.from(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7","base64"));
assert.equal(inspectGif(gif).frames,1);assert.equal(inspectGif(gif).width,1);
assert.throws(()=>inspectGif(new Uint8Array(20)),/could not be read/);
const blocks=gif.slice(19,-1);blocks[4]=100;blocks[5]=0;
const long=Uint8Array.from([...gif.slice(0,19),...Array.from({length:11},()=>[...blocks]).flat(),0x3b]);
assert.throws(()=>inspectGif(long),/10 seconds/);
const motion={avatar_url:"https://test/poster.jpg",avatar_video_url:"https://test/clip.mp4",avatar_gif_url:""};
for(const avatar_preset of ["initials",AVATAR_PRESETS[0].url]){const row=withPresetAvatar({...motion,avatar_preset});assert.equal(row.avatar_video_url,"");assert.equal(row.avatar_gif_url,"");}
assert.equal(withPresetAvatar({...motion,avatar_preset:""}).avatar_video_url,motion.avatar_video_url);
for(const name of ["User","PublicProfile"]){const schema=JSON.parse(fs.readFileSync("base44/entities/"+name+".jsonc","utf8"));for(const key of ["avatar_video_url","avatar_gif_url","banner_video_url","banner_gif_url"])assert.equal(schema.properties[key].rls.write,false,"media metadata must keep the protected save route");}
console.log("PASS file formats and byte limits; GIF block timing and excessive-loop rejection; gallery/initials stop old animations; protected media fields");

assert.equal(profileMotionSeconds("banner"),60);assert.equal(profileMotionSeconds("avatar"),10);
assert.equal(inspectGif(long,"banner").duration,11);
const minute=Uint8Array.from([...gif.slice(0,19),...Array.from({length:60},()=>[...blocks]).flat(),0x3b]);
assert.equal(inspectGif(minute,"banner").duration,60);
const tooLong=Uint8Array.from([...gif.slice(0,19),...Array.from({length:61},()=>[...blocks]).flat(),0x3b]);
assert.throws(()=>inspectGif(tooLong,"banner"),/60 seconds/);
validateMotionDuration(45,"banner");validateMotionDuration(60,"banner");
for(const duration of [0,-1,NaN,Infinity,61])assert.throws(()=>validateMotionDuration(duration,"banner"));
assert.throws(()=>validateMotionDuration(11,"avatar"),/10 seconds/);
console.log("PASS banners accept 60-second GIF/video durations and reject oversized loops; avatars retain their existing limit");
