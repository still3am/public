import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import { profileViewerMedia, profileMediaKey } from "../src/lib/profileViewerMedia.js";
import { profileCommentFilter, isProfileCommentThread } from "../src/lib/profileCommentThread.js";
import { AVATAR_PRESETS } from "../src/lib/avatarPresets.js";

assert.deepEqual(profileViewerMedia({avatar_url:"/photo.jpg"}),{poster:"/photo.jpg",source:"/photo.jpg",type:"image"});
assert.equal(profileViewerMedia({avatar_url:"/photo.gif?original=1"}).type,"gif");
assert.equal(profileViewerMedia({avatar_url:"/poster.jpg",avatar_gif_url:"/original.gif"}).source,"/original.gif");
const clip={id:"person",display_name:"Member",avatar_url:"/poster.jpg",avatar_video_url:"/original.mp4"};
assert.equal(profileViewerMedia(clip).type,"video");
assert.equal(profileViewerMedia(clip).source,"/original.mp4","video keeps the original audio-bearing source");
assert.equal(profileViewerMedia({...clip,avatar_preset:"initials"}).type,"image","an initials override cannot reveal an old clip");
const gallery=AVATAR_PRESETS.find(row=>row.gifUrl);
assert.ok(gallery);
assert.equal(profileViewerMedia({...clip,avatar_preset:gallery.url}).source,gallery.gifUrl,"gallery selection wins over stale uploaded media");
assert.equal(profileViewerMedia(null).source,"/avatars/default-headphones.webp");

let states=[],si=0,refs=[],ri=0,effects=[],musicPauses=0,closed=0,restored=0;
const useState=initial=>{const i=si++;if(!(i in states))states[i]=initial;return [states[i],next=>{states[i]=typeof next==="function"?next(states[i]):next;}];};
const deps={React,useState,useRef:initial=>refs[ri++]??(refs[ri-1]={current:initial}),useEffect:effect=>effects.push(effect),useCoverUrl:url=>url,usePlayer:()=>({isPlaying:false,pausePlayback:()=>musicPauses++}),profileViewerMedia,profileMediaKey,useCoverPalette:()=>({colors:["#ff5522","#6644aa","#334499"]}),MotionGradient:"gradient",Dialog:"dialog-root",DialogContent:"dialog-content",DialogHeader:"header",DialogTitle:"h2",DialogDescription:"p",ImageOff:"image-off",RotateCcw:"retry-icon",Play:"play-icon",Pause:"pause-icon",Volume2:"volume-icon",VolumeX:"muted-icon",ProfileComments:"comments"};
globalThis.__profileMediaViewer=deps;
const source=ts.transpileModule(fs.readFileSync("src/components/profile/ProfileMediaViewer.jsx","utf8").replace(/^import[^;]+;/gm,""),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {default:Viewer}=await import("data:text/javascript;base64,"+Buffer.from("const {"+Object.keys(deps).join(",")+"}=globalThis.__profileMediaViewer;\n"+source).toString("base64"));
const all=node=>!node||typeof node!=="object"?[]:[node,...React.Children.toArray(node.props?.children).flatMap(all)];
const render=profile=>{si=ri=0;effects=[];return Viewer({profile,profileId:"person",isOwn:false,onClose:()=>closed++,onReturnFocus:()=>restored++});};
let tree=render(clip),nodes=all(tree),video=nodes.find(node=>node.type==="video");
assert.equal(video.props.src,"/original.mp4");assert.equal(video.props.controls,false);assert.equal(video.props.playsInline,true);assert.equal(video.props.autoPlay,undefined,"sound does not autoplay");assert.equal(video.props.muted,false,"explicit playback can retain source sound");
video.props.onPlay();assert.equal(musicPauses,1,"clip playback pauses music");
video.props.onVolumeChange({currentTarget:{muted:false,paused:false}});assert.equal(musicPauses,2);
const comments=nodes.find(node=>node.type==="comments");assert.equal(comments.props.profileId,"person");assert.equal(comments.props.isOwn,false);assert.equal(comments.props.presentation,"media");comments.props.onNavigate();assert.equal(closed,1);
tree.props.onOpenChange(false);assert.equal(closed,2);
let prevented=false;nodes.find(node=>node.type==="dialog-content").props.onCloseAutoFocus({preventDefault(){prevented=true;}});assert.equal(restored,1);assert.ok(prevented);

let mediaPauses=0,visibility;
globalThis.document={hidden:false,addEventListener:(name,handler)=>{if(name==="visibilitychange")visibility=handler;},removeEventListener:(name,handler)=>{assert.equal(handler,visibility);}};
refs[0].current={pause:()=>mediaPauses++};
const cleanup=effects[0]();document.hidden=true;visibility();assert.equal(mediaPauses,1);cleanup();assert.equal(mediaPauses,2,"closing pauses media");delete globalThis.document;
video.props.onError();tree=render(clip);assert.ok(all(tree).some(node=>node.props?.role==="alert"));
all(tree).find(node=>node.type==="button" && !node.props["aria-label"]).props.onClick();tree=render(clip);assert.ok(!all(tree).some(node=>node.props?.role==="alert"),"failed media can retry");
states=[];tree=render({id:"person",avatar_url:"/poster.jpg",avatar_gif_url:"/original.gif"});
assert.equal(all(tree).find(node=>node.type==="img").props.src,"/original.gif","viewer displays the GIF bytes, not the static poster");
assert.ok(!all(tree).some(node=>node.type==="video"));

const profile=fs.readFileSync("src/pages/Profile.jsx","utf8"),avatar=fs.readFileSync("src/components/profile/ProfileAvatar.jsx","utf8"),css=fs.readFileSync("src/components/profile/profile-media-viewer.css","utf8");
assert.ok(avatar.includes("!editing && onView"));
assert.ok(profile.includes("onView={(event)"));
assert.ok(profile.includes("active={isCurrentPage && !showMedia}"));
assert.ok(profile.includes("showMedia && isCurrentPage && !editMode"));
assert.ok(css.includes("height:100dvh"));
assert.ok(css.includes("env(safe-area-inset-bottom"));
assert.ok(css.includes("object-fit:contain"));
// Media follows the centered wordmark and precedes the profile identity.
tree=render(clip);nodes=all(tree);
assert.ok(nodes.findIndex(node=>node.props?.className==="profile-media-viewer-topbar") < nodes.findIndex(node=>node.type==="video"));
assert.ok(nodes.findIndex(node=>node.type==="video") < nodes.findIndex(node=>node.type==="h2"));
let played=0,paused=0;
refs[0].current={paused:true,muted:false,play(){played++;return Promise.resolve();},pause(){paused++;}};
nodes.find(node=>node.type==="button" && node.props["aria-label"]==="Play profile clip").props.onClick();
assert.equal(played,1);
nodes.find(node=>node.type==="button" && node.props["aria-label"]==="Mute clip sound").props.onClick();
assert.equal(refs[0].current.muted,true);
refs[0].current.paused=false;
nodes.find(node=>node.type==="button" && node.props["aria-label"]==="Play profile clip").props.onClick();
assert.equal(paused,1);
assert.ok(css.includes("width:min(500px"));
assert.ok(css.includes("aspect-ratio:auto;min-height:0"));
console.log("PASS profile image/GIF/video source selection, original sound, music handoff, media cleanup, comments, focus return, retry and mobile layout");

// The viewer composer is after real comments in both DOM and keyboard order.
let commentStates=[],commentRefs=[],ci=0,cri=0,created=[];
const viewerComment={profile_id:"person",media_key:profileMediaKey(profileViewerMedia(clip)),id:"comment-1",author_id:"other",author_name:"Other member",message:"Great photo",created_date:"2026-10-26T01:00:00Z"};
const commentDeps={React,profileCommentFilter,isProfileCommentThread,
 useState:initial=>{const i=ci++;if(!(i in commentStates))commentStates[i]=initial;return [commentStates[i],next=>commentStates[i]=typeof next==="function"?next(commentStates[i]):next];},
 useRef:initial=>commentRefs[cri++]??(commentRefs[cri-1]={current:initial}),useEffect:()=>{},useCallback:fn=>fn,
 useAuth:()=>({user:{id:"listener",display_name:"Listener",avatar_url:"/avatar.jpg"}}),
 useSafety:()=>({blocked:new Set()}),coalesce:fn=>fn,reportActionError:()=>assert.fail("Unexpected comment error"),
 readAllPages:async()=>[viewerComment],base44:{entities:{ProfileComment:{create:async data=>{created.push(data);return {...data,id:"saved",created_date:"2026-10-26T02:00:00Z"};}},Notification:{create:async()=>({})}}},
 Link:"a",Avatar:"avatar",SafetyControls:"safety",Loader2:"loading",Send:"send",Trash2:"trash"};
globalThis.__mediaComments=commentDeps;
const commentSource=ts.transpileModule(fs.readFileSync("src/components/profile/ProfileComments.jsx","utf8").replace(/^import[^;]+;/gm,""),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {default:Comments}=await import("data:text/javascript;base64,"+Buffer.from("const {"+Object.keys(commentDeps).join(",")+"}=globalThis.__mediaComments;\n"+commentSource).toString("base64"));
commentStates=[[viewerComment],false,false,"Hello!",false,10];
const renderComments=presentation=>{ci=cri=0;return Comments({profileId:"person",isOwn:false,presentation,description:"",mediaKey:presentation==="media"?profileMediaKey(profileViewerMedia(clip)):""});};
let commentTree=renderComments("media"),commentNodes=all(commentTree);
assert.ok(commentNodes.findIndex(node=>node.props?.className?.includes("profile-comment-row")) < commentNodes.findIndex(node=>node.type==="form"),"media comments precede the composer");
assert.ok(commentNodes.some(node=>node.type==="avatar" && node.props.className==="profile-comment-composer-avatar"));
assert.equal(commentNodes.filter(node=>node.type==="form").length,1);
await commentNodes.find(node=>node.type==="form").props.onSubmit({preventDefault(){}});
assert.equal(created.length,1);assert.equal(created[0].message,"Hello!");assert.equal(created[0].profile_id,"person");assert.equal(created[0].author_id,"listener");
assert.equal(commentStates[3],"","confirmed save clears the composer");
commentStates[0]=[{...viewerComment,media_key:""}];commentTree=renderComments("profile");commentNodes=all(commentTree);
assert.ok(commentNodes.findIndex(node=>node.type==="form") < commentNodes.findIndex(node=>node.props?.className?.includes("profile-comment-row")),"normal profile conversation keeps its original composer placement");
console.log("PASS reference-style comments layout, one bottom composer, current-user avatar and confirmed comment persistence");

const avatarKey=profileMediaKey(profileViewerMedia(clip));
assert.match(avatarKey,/^avatar:video:[a-f0-9]{16}$/);
assert.notEqual(avatarKey,profileMediaKey(profileViewerMedia({...clip,avatar_video_url:"/new.mp4"})));
assert.deepEqual(profileCommentFilter("person",avatarKey),{profile_id:"person",media_key:avatarKey});
assert.ok(isProfileCommentThread({profile_id:"person"},"person"),"legacy comments remain on the page");
assert.equal(isProfileCommentThread({profile_id:"person"},"person",avatarKey),false);
assert.equal(isProfileCommentThread({profile_id:"person",media_key:avatarKey},"person"),false);
assert.equal(isProfileCommentThread({profile_id:"other",media_key:avatarKey},"person",avatarKey),false);
assert.equal(created[0].media_key,avatarKey,"new image comments save to their own thread");
tree=render(clip);nodes=all(tree);
assert.equal(nodes.find(node=>node.type==="comments").props.mediaKey,avatarKey);
assert.ok(nodes.some(node=>node.type==="gradient"),"viewer renders an animated color gradient");
console.log("PASS separate image/page threads, legacy page comments, per-asset identity and animated gradient");
