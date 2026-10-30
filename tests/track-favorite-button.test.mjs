import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
let states=[],refs=[],effects=[],stateIndex=0,refIndex=0,user={id:'listener'},writes=[],events={},redirected=false;
globalThis.window={location:{href:'https://public.example/track/song'},addEventListener:(name,fn)=>{events[name]=fn;},removeEventListener(){}};
globalThis.__favoriteHarness={React,useState(initial){const i=stateIndex++;if(!(i in states))states[i]=initial;return[states[i],next=>{states[i]=typeof next==='function'?next(states[i]):next;}];},useRef(initial){const i=refIndex++;return refs[i]||(refs[i]={current:initial});},useEffect:fn=>effects.push(fn),useAuth:()=>({user}),Heart:props=>React.createElement('svg',props),base44:{auth:{redirectToLogin(){redirected=true;}}},readLikeState:async()=>true,setLikeState:async(client,uid,id,liked)=>{writes.push({uid,id,liked});return{liked};},withReadTimeout:p=>p};
const source=fs.readFileSync('src/components/track/TrackFavoriteButton.jsx','utf8').replace(/^import[^;]+;/gm,'');
const code=ts.transpileModule('const {React,useState,useRef,useEffect,useAuth,Heart,base44,readLikeState,setLikeState,withReadTimeout}=globalThis.__favoriteHarness;'+source,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {default:Favorite}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function render(trackId='song'){stateIndex=0;refIndex=0;effects=[];return Favorite({trackId});}
const button=tree=>React.Children.toArray(tree.props.children).find(n=>n.type==='button');
let tree=render();assert.equal(button(tree).props.disabled,true);effects[0]();effects[1]();await new Promise(resolve=>setImmediate(resolve));
tree=render();assert.equal(button(tree).props['aria-pressed'],true);assert.equal(button(tree).props['aria-label'],'Remove from favorites');
await button(tree).props.onClick();tree=render();assert.equal(button(tree).props['aria-pressed'],false);assert.deepEqual(writes,[{uid:'listener',id:'song',liked:false}]);
events['likes:changed']({detail:{uid:'listener',trackId:'song',liked:true}});tree=render();assert.equal(button(tree).props['aria-pressed'],true,'menu likes stay synchronized with the heart');
tree=render('another-song');assert.equal(button(tree).props['aria-pressed'],false,'a new track never inherits the previous favorite');
user=null;tree=render();await button(tree).props.onClick();assert.equal(redirected,true);assert.equal(writes.length,1,'guests never write a favorite');
console.log('PASS favorite loading, existing state, confirmed toggles, event sync, track isolation and guest sign-in');
