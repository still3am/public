import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
let effects=[],states=[],cursor=0,refCursor=0,playError={name:'NotAllowedError'};
const video={muted:false,defaultMuted:false,playsInline:false,plays:0,pauses:0,play(){this.plays++;return playError?Promise.reject(playError):Promise.resolve();},pause(){this.pauses++;}};
globalThis.__mediaReact=React;
globalThis.__mediaHooks={useState:()=>{const i=cursor++;return [states[i],value=>{states[i]=value;}];},useRef:()=>({current:refCursor++===0?{}:video}),useEffect:fn=>effects.push(fn)};
const code=ts.transpileModule(`const React=globalThis.__mediaReact;const {useState,useRef,useEffect}=globalThis.__mediaHooks;const useCoverUrl=value=>value;\n`+fs.readFileSync('src/components/ProfileMedia.jsx','utf8').replace(/^import[^;]+;/gm,''),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {default:Media}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function render(values=[true,false,false,false]){effects=[];states=values;cursor=0;refCursor=0;return Media({src:'poster.webp',videoSrc:'clip.mp4'});}
render();effects[3]();await new Promise(resolve=>setImmediate(resolve));
assert.equal(states[3],true,'autoplay restrictions offer an interaction retry');assert.equal(states[2],false,'autoplay policy is not a permanent media failure');
assert.ok(video.muted&&video.defaultMuted&&video.playsInline,'video requests silent inline playback');
const tree=render([true,false,false,true]);playError=null;tree.props.onPointerDown();await new Promise(resolve=>setImmediate(resolve));assert.equal(states[3],false,'user interaction can recover blocked autoplay');
render([false,false,false,false]);const paused=video.pauses;effects[3]();assert.equal(video.pauses,paused+1,'offscreen media pauses');
console.log('PASS muted inline autoplay, recoverable browser restrictions, tap retry and offscreen pause');
