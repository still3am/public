import {AVATAR_PRESETS} from "../src/lib/avatarPresets.js";
globalThis.AVATAR_PRESETS=AVATAR_PRESETS;
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import {isMotionFile,PROFILE_MEDIA_ACCEPT} from "../src/lib/profileMotion.js";
globalThis.__motionHelpers={isMotionFile,PROFILE_MEDIA_ACCEPT};
globalThis.__React=React;
let clicked=0,files=[];let states=[],stateIndex=0;
globalThis.__avatarState=initial=>{const i=stateIndex++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=value];};
globalThis.__avatarInput={current:{click(){clicked++;}}};
const load=async(path,stubs)=>import("data:text/javascript;base64,"+Buffer.from(ts.transpileModule(stubs+fs.readFileSync(path,"utf8").replace(/^import[^;]+;/gm,""),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString("base64"));
const {default:ProfileAvatar}=await load("src/components/profile/ProfileAvatar.jsx",`
const React=globalThis.__React,useRef=()=>globalThis.__avatarInput,useState=globalThis.__avatarState,useCoverUrl=url=>url,Camera=()=>null,Loader2=Camera,Avatar=()=>null;
const AvatarPicker=props=>React.createElement("section",props),ProfileImageEditor=props=>React.createElement("article",props),ProfileMotionEditor=props=>React.createElement("aside",props);
const {isMotionFile,PROFILE_MEDIA_ACCEPT}=globalThis.__motionHelpers;
`);
function render(props){stateIndex=0;return ProfileAvatar(props);}
function nodes(tree,type){if(!tree||typeof tree!=="object")return [];return [...(tree.type===type?[tree]:[]),...React.Children.toArray(tree.props?.children).flatMap(child=>nodes(child,type))];}
const props={user:{id:"listener",avatar_url:"portrait.jpg"},editing:true,onUpload:file=>files.push(file)};
let tree=render(props);
const button=nodes(tree,"button")[0],input=nodes(tree,"input")[0];
assert.equal(button.props["aria-label"],"Choose profile image");button.props.onClick();assert.equal(states[0],true,"keyboard/button activation opens the avatar gallery");
tree=render(props);const picker=nodes(tree,"section");const findPicker=n=>!n||typeof n!=="object"?null:typeof n.type==="function"&&n.props?.onSelect?n:React.Children.toArray(n.props?.children).map(findPicker).find(Boolean);
findPicker(tree).props.onUpload();assert.equal(clicked,1,"gallery upload opens the native file picker");
const file={name:"portrait.jpg",type:"image/jpeg"},target={files:[file],value:"portrait.jpg"};
input.props.onChange({target});assert.equal(target.value,"","same-file retry is enabled");assert.equal(files.length,0,"selecting a file stages the crop before upload");
tree=render(props);const findCrop=n=>!n||typeof n!=="object"?null:typeof n.type==="function"&&n.props?.onApply?n:React.Children.toArray(n.props?.children).map(findCrop).find(Boolean);
assert.equal(findCrop(tree).props.file,file);const cropped={name:"profile-avatar.jpg",type:"image/jpeg"};findCrop(tree).props.onApply({avatar:cropped});assert.equal(files[0],cropped);
input.props.onChange({target:{files:[],value:""}});assert.equal(files.length,1,"cancelled file selection never starts an upload");
tree=render({...props,busy:true});assert.equal(nodes(tree,"button")[0].props.disabled,true);assert.equal(nodes(tree,"input")[0].props.disabled,true);
tree=render({...props,editing:false});assert.equal(nodes(tree,"button").length,0,"upload controls are absent outside edit mode");
const motionUploads=[];tree=render({...props,onMotionUpload:media=>motionUploads.push(media)});const motionInput=nodes(tree,"input")[0];assert.ok(motionInput.props.accept.includes("video/mp4"));
motionInput.props.onChange({target:{files:[{name:"clip.mp4",type:"video/mp4"}],value:""}});tree=render({...props,onMotionUpload:media=>motionUploads.push(media)});const motionPreview=findCrop(tree);assert.equal(motionPreview.props.file.name,"clip.mp4");const prepared={type:"video",duration:2};motionPreview.props.onApply(prepared);assert.equal(motionUploads[0],prepared);
assert.equal(nodes(render(props),"input")[0].props.accept,"image/*","photo-only consumers keep their existing picker");
let failed=false;
globalThis.__avatarFailure=()=>[failed,next=>failed=next];
const {default:Avatar}=await load("src/components/Avatar.jsx",`
const React=globalThis.__React,useState=globalThis.__avatarFailure,useEffect=()=>{},withPresetAvatar=value=>value,ProfileMedia=props=>React.createElement("span",props);
`);
let avatar=Avatar({user:props.user,size:96,className:"profile-desktop-avatar"});assert.equal(avatar.type,"img");
assert.equal(avatar.props.style.objectFit,"cover");avatar.props.onError();avatar=Avatar({user:{...props.user,display_name:"Listener"},size:96,className:"profile-desktop-avatar"});
assert.equal(avatar.type,"div");assert.equal(avatar.props.children,"L");assert.ok(avatar.props.className.includes("profile-desktop-avatar"),"image failure retains the same frame sizing class");
console.log("PASS accessible profile upload, busy state, same-file retry, cancellation and initials fallback");