import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as React from 'react';
import {EQ_PRESETS} from '../src/lib/equalizer.js';
import {equalPowerTransitionCurve,commitAudioHandoff} from '../src/lib/audioHandoff.js';
for(const duration of [.1,1,4,12]){
 const incoming=equalPowerTransitionCurve(true,duration),outgoing=equalPowerTransitionCurve(false,duration);
 assert.equal(incoming[0],0);assert.equal(incoming.at(-1),1);assert.equal(outgoing[0],1);
 for(let i=0;i<incoming.length;i++){assert.ok(Math.abs(incoming[i]**2+outgoing[i]**2-1)<.00001);if(i)assert.ok(incoming[i]>=incoming[i-1]);}
 assert.ok(incoming[1]-incoming[0]<.01,'smooth start reduces envelope jumps');
}
let paused=0;assert.equal(await commitAudioHandoff({play:()=>new Promise(()=>{}),pause:()=>paused++},()=>true,()=>{},5),false);assert.equal(paused,1,'stalled incoming audio is stopped');
const player={mixer:{bass:0,beat:0,vocals:0,treble:0,boost:1,enabled:true},enableMixer:()=>true,setMixerValue(key,value){this.mixer={...this.mixer,[key]:value};},setMixerValues(values){this.mixer={...this.mixer,...values};},resetMixer(){this.mixer={bass:0,beat:0,vocals:0,treble:0,boost:1,enabled:true};}};
globalThis.__eq={React,EQ_PRESETS,usePlayer:()=>player,useEffect:()=>{},useState:value=>[value,()=>{}],Power:'power',RotateCcw:'reset',Dialog:'dialog',DialogContent:'content',DialogHeader:'header',DialogTitle:'h2',DialogDescription:'p'};
const source=ts.transpileModule(fs.readFileSync('src/components/StemMixer.jsx','utf8').replace(/^import[^;]+;/gm,''),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const View=(await import('data:text/javascript;base64,'+Buffer.from('const {'+Object.keys(globalThis.__eq).join(',')+'}=globalThis.__eq;\n'+source).toString('base64'))).default;
const nodes=node=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(nodes)];
let closed=0;const render=()=>View({onClose:()=>closed++});
let tree=render(),all=nodes(tree),inputs=all.filter(n=>n.type==='input');assert.equal(inputs.length,5);
inputs.find(n=>n.props['aria-label']==='Bass').props.onChange({target:{value:'6'}});assert.equal(player.mixer.bass,6);
all.find(n=>n.props['aria-label']==='Reset Bass to zero').props.onClick();assert.equal(player.mixer.bass,0);
all.find(n=>n.props['aria-label']==='Equalizer preset').props.onChange({target:{value:'Warm'}});assert.equal(player.mixer.bass,3);assert.equal(player.mixer.treble,-2);
all.find(n=>n.props['aria-label']==='Bypass equalizer').props.onClick();assert.equal(player.mixer.enabled,false);
tree.props.onOpenChange(false);assert.equal(closed,1);
const context=fs.readFileSync('src/context/PlayerContext.jsx','utf8'),ast=ts.createSourceFile('context.jsx',context,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);let crossfade;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='beginCrossfade')crossfade=node.initializer.arguments[0].getText(ast);ts.forEachChild(node,visit);}visit(ast);
let preloads=0;const env={crossfadingRef:{current:false},pureRemoteRef:{current:false},activeIdxRef:{current:0},inactiveIdx:()=>1,els:()=>[{},{}],queueRef:{current:[{id:'a'},{id:'b'}]},sideLoadedIdRef:[{current:'a'},{current:null}],sideReadyRef:[{current:true},{current:false}],preloadedTargetRef:{current:1},preloadSide:()=>preloads++};
const begin=new Function(...Object.keys(env),'return ('+crossfade+')')(...Object.values(env));
for(let i=0;i<20;i++)assert.equal(await begin(1,4,4),false);assert.equal(preloads,0,'waiting for readiness must not restart an in-flight preload');
env.preloadedTargetRef.current=null;await begin(1,4,4);assert.equal(preloads,1);await begin(1,4,4);assert.equal(preloads,1);
console.log('PASS equal-power smooth fades, failed handoff cleanup, equalizer controls/presets/bypass, and stable crossfade preloading');
