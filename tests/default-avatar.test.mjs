import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import {withPresetAvatar} from "../src/lib/nativeAvatar.js";
globalThis.__React=React;globalThis.__resolve=withPresetAvatar;
let states=[],cursor=0;
globalThis.__state=value=>{const i=cursor++;return [states[i]??value,next=>states[i]=next];};
const source=fs.readFileSync("src/components/Avatar.jsx","utf8").replace(/^import[^;]+;/gm,"");
const stub='const React=globalThis.__React,withPresetAvatar=globalThis.__resolve,useState=globalThis.__state,useEffect=()=>{},ProfileMedia="motion";';
const code=ts.transpileModule(stub+source,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const Avatar=(await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"))).default;
const render=props=>{cursor=0;return Avatar(props);};
for(const user of [{id:"existing"},{id:"new",avatar_url:""},{avatar_url:"old.jpg",avatar_preset:"initials"}]){
 states=[];const node=render({user,size:96});assert.equal(node.type,"img");assert.equal(node.props.src,"/avatars/default-headphones.webp");assert.equal(node.props.style.borderRadius,"50%");
}
states=[];assert.equal(render({user:{avatar_url:"chosen.jpg"}}).props.src,"chosen.jpg");
states=[];assert.equal(render({user:{avatar_preset:"/avatars/green-buckle.webp"}}).props.src,"/avatars/green-buckle.webp");
states=[];let node=render({user:{avatar_url:"broken.jpg"}});node.props.onError();node=render({user:{avatar_url:"broken.jpg"}});assert.equal(node.props.src,"/avatars/default-headphones.webp");
node.props.onError();assert.equal(render({user:{display_name:"Alice",avatar_url:"broken.jpg"}}).type,"div");
assert.equal(render({user:null}),null);
const asset=fs.readFileSync("public/avatars/default-headphones.webp");assert.equal(asset.toString("ascii",0,4),"RIFF");assert.equal(asset.toString("ascii",8,12),"WEBP");
console.log("PASS default avatars for existing/new users, preserved selections, broken-image recovery and circular frame");
