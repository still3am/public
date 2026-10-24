import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as React from 'react';
import {youtubeEmbedUrl,youtubeErrorMessage} from '../src/lib/youtubePlayer.js';
assert.match(youtubeErrorMessage(101),/owner/);assert.match(youtubeErrorMessage(150),/owner/);assert.match(youtubeErrorMessage(100),/removed/);assert.match(youtubeErrorMessage(153),/verify/);
const embed=new URL(youtubeEmbedUrl('yKNxeF4KMsY','https://public.example/track/1'));assert.equal(embed.searchParams.get('enablejsapi'),'1');assert.equal(embed.searchParams.get('origin'),'https://public.example');assert.throws(()=>youtubeEmbedUrl('invalid','https://test'));
const events=new EventTarget(),docEvents=new EventTarget();
globalThis.window={location:{origin:'https://public.example'},addEventListener:(...args)=>events.addEventListener(...args),removeEventListener:(...args)=>events.removeEventListener(...args)};
globalThis.document={hidden:false,createElement:()=>({style:{}}),addEventListener:(...args)=>docEvents.addEventListener(...args),removeEventListener:(...args)=>docEvents.removeEventListener(...args)};
let hooks=[],cursor=0,effects=[],instances=[],plays=0;
globalThis.__videoHooks={useRef:value=>{const i=cursor++;return hooks[i]??=({current:value});},useState:value=>{const i=cursor++;if(!(i in hooks))hooks[i]=value;return [hooks[i],v=>hooks[i]=typeof v==='function'?v(hooks[i]):v];},useEffect:(fn,deps)=>{const i=cursor++,old=hooks[i];if(!old||deps.some((v,j)=>v!==old.deps[j])){old?.cleanup?.();hooks[i]={deps};effects.push(()=>{hooks[i].cleanup=fn();});}}};
globalThis.__loadYT=async()=>({Player:class {constructor(iframe,options){this.iframe=iframe;this.options=options;this.pauses=0;this.destroyed=false;instances.push(this);}pauseVideo(){this.pauses++;}destroy(){this.destroyed=true;}}});
globalThis.__React=React;globalThis.__videoHelpers={youtubeEmbedUrl,youtubeErrorMessage};
let source=fs.readFileSync('src/components/YouTubeMusicVideo.jsx','utf8').replace(/^import[^;]+;/gm,'');
const stub='const React=globalThis.__React,{useEffect,useRef,useState}=globalThis.__videoHooks,loadYouTubePlayer=globalThis.__loadYT,{youtubeEmbedUrl,youtubeErrorMessage}=globalThis.__videoHelpers;';
const code=ts.transpileModule(stub+source,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const View=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
const all=(node,test)=>!node||typeof node!=='object'?[]:[...(test(node)?[node]:[]),...React.Children.toArray(node.props?.children).flatMap(child=>all(child,test))];
const text=node=>typeof node==='string'?node:!node||typeof node!=='object'?'':React.Children.toArray(node.props?.children).map(text).join(' ');
let props={id:'yKNxeF4KMsY',title:'Yellow',audioPlaying:false,active:true,onPlay:()=>plays++};
function render(){cursor=0;const tree=View(props);for(const node of all(tree,n=>n.props?.ref))node.props.ref.current??={children:[],replaceChildren(...children){this.children=children;}};const jobs=effects;effects=[];jobs.forEach(fn=>fn());return tree;}
try{
 render();await new Promise(r=>setImmediate(r));const player=instances[0];assert.equal(player.iframe.referrerPolicy,'strict-origin-when-cross-origin');player.options.events.onReady({target:player});player.options.events.onStateChange({data:1,target:player});assert.equal(plays,1);
 props={...props,audioPlaying:true};render();assert.equal(player.pauses,1);assert.equal(player.destroyed,false,'resuming Public audio pauses rather than destroys the video');
 props={...props,active:false};render();assert.equal(player.pauses,2);player.options.events.onStateChange({data:1,target:player});assert.equal(plays,1,'hidden page cannot play background video');
 document.hidden=true;docEvents.dispatchEvent(new Event('visibilitychange'));assert.equal(player.pauses,4);
 player.options.events.onError({data:101});assert.match(text(render()),/owner/);const retry=all(render(),n=>n.type==='button')[0];retry.props.onClick();render();await new Promise(r=>setImmediate(r));assert.equal(player.destroyed,true);assert.equal(instances.length,2,'retry creates a fresh official player');
 console.log('PASS official embed origin, blocked-video errors, actual play coordination, preserved video state, route/visibility pause, retry and disposal');
}finally{for(const hook of hooks)hook?.cleanup?.();}
