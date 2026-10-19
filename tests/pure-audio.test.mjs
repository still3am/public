import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {DEFAULT_PURE,normalizePure,pureParameters,createPureGraph,readPure} from "../src/lib/pureAudio.js";
assert.deepEqual(normalizePure(null),DEFAULT_PURE);
assert.deepEqual(normalizePure({enabled:"yes",clarity:Infinity,bass:999,balance:-2}),{enabled:false,clarity:50,bass:100,balance:0});
for(const enabled of [false,true])for(let n=0;n<=100;n++){
 const p=pureParameters({enabled,clarity:n,bass:n,balance:n});assert.ok(Object.values(p).every(Number.isFinite));assert.ok(p.headroom>0&&p.headroom<=1);assert.ok(p.ratio>=1&&p.ratio<=2.5);
 assert.ok(p.headroom*10**((p.bass+p.presence+p.air)/20)<=1.00000001);
}
const bypass=pureParameters({enabled:false,clarity:100,bass:100,balance:100});
assert.equal(bypass.headroom,1);assert.equal(bypass.ratio,1);for(const k of ["bass","presence","air","mud","threshold","knee"])assert.equal(bypass[k],0);
globalThis.localStorage={getItem(){throw Error("storage blocked");}};assert.deepEqual(readPure(),DEFAULT_PURE);
console.log("PASS Pure clamps preferences, starts off, has neutral bypass, and compensates positive EQ gain");
let nodes=[],scheduled=0;const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(value){this.value=value;scheduled++;}});
const node=type=>{const n={type,connections:[],gain:param(),frequency:param(),Q:param(),threshold:param(),ratio:param(),knee:param(),attack:param(),release:param(),connect(next){n.connections.push(next);}};nodes.push(n);return n;};
const ctx={currentTime:0,state:"running",createBiquadFilter:()=>node("filter"),createGain:()=>node("gain"),createDynamicsCompressor:()=>node("compressor")};
const graph=createPureGraph(ctx);assert.equal(nodes.length,6);for(let i=0;i<5;i++)assert.deepEqual(nodes[i].connections,[nodes[i+1]]);
assert.equal(graph.input,nodes[0]);assert.equal(graph.output,nodes[5]);assert.equal(nodes[5].ratio.value,1);
graph.apply({enabled:true,clarity:100,bass:100,balance:100});assert.ok(scheduled>=10);assert.equal(nodes[0].gain.value,2.4);assert.equal(nodes[2].gain.value,2);assert.equal(nodes[5].ratio.value,2.5);
graph.apply(DEFAULT_PURE);assert.equal(nodes[0].gain.value,0);assert.equal(nodes[4].gain.value,1);assert.equal(nodes[5].ratio.value,1);
console.log("PASS the real graph is one serial chain; settings schedule actual filter, headroom and compressor changes");
const source=fs.readFileSync("src/context/PlayerContext.jsx","utf8"),ast=ts.createSourceFile("player.jsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
let expression;const walk=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==="setPureValues")expression=n.initializer.arguments[0].getText(ast);ts.forEachChild(n,walk);};walk(ast);assert.ok(expression);
function fixture(){
 const state={},env={isPlayingRef:{current:true},normalizePure,pureRef:{current:{...DEFAULT_PURE}},pureRequestRef:{current:0},pureRemoteRef:{current:false},pureGraphRef:{current:graph},audioCtxRef:{current:ctx},ensureGraph:()=>ctx,setPureError:v=>state.error=v,setPureState:v=>state.value=v};
 const change=new Function(...Object.keys(env),"return ("+expression+")")(...Object.values(env));return {state,env,change};
}
{
 const {state,change}=fixture();assert.equal(await change({enabled:true}),true);assert.equal(state.value.enabled,true);await change({enabled:false});assert.equal(state.value.enabled,false);
}
{
 const {state,env,change}=fixture();env.pureRemoteRef.current=true;assert.equal(await change({enabled:true}),false);assert.match(state.error,/this device/);assert.equal(env.pureRef.current.enabled,false);
}
{
 const {state,env,change}=fixture();env.ensureGraph=()=>null; // Recompile to use replacement dependency.
 const failed=new Function(...Object.keys(env),"return ("+expression+")")(...Object.values(env));assert.equal(await failed({enabled:true}),false);assert.match(state.error,/could not start/);
}
{
 const {state,env}=fixture();let reject;const suspended={...ctx,state:"suspended",resume:()=>new Promise((_,r)=>{reject=r;})};env.ensureGraph=()=>suspended;
 const change=new Function(...Object.keys(env),"return ("+expression+")")(...Object.values(env));
 const pending=change({enabled:true});await change({enabled:false});reject(Error("blocked"));await pending;assert.equal(state.value.enabled,false);assert.equal(state.error,"");
}
{
 const {state,env}=fixture();env.isPlayingRef.current=false;env.audioCtxRef.current=null;env.pureGraphRef.current=null;let starts=0;
 env.ensureGraph=()=>{starts++;return null;};
 const change=new Function(...Object.keys(env),"return ("+expression+")")(...Object.values(env));
 assert.equal(await change({enabled:true}),true,"PURE can be selected before any music is playing");
 assert.equal(state.value.enabled,true);assert.equal(starts,0,"saving idle preferences must not require an audio engine");
 await change({clarity:72});assert.equal(state.value.clarity,72);assert.equal(state.value.enabled,true);
 await change({enabled:false});assert.equal(state.value.enabled,false);
 console.log("PASS idle/paused users can enable, tune and disable PURE without starting Web Audio");
}
console.log("PASS player activation, remote-playback restrictions, unavailable engines and stale resume failures preserve user intent");
{
 let compareExpression;const find=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==="comparePure")compareExpression=n.initializer.arguments[0].getText(ast);ts.forEachChild(n,find);};find(ast);
 assert.ok(compareExpression);let comparing=false;const saved={...DEFAULT_PURE,enabled:true,clarity:73};
 const pureRef={current:saved},pureRemoteRef={current:false},setPureComparing=value=>{comparing=value;};
 const compare=new Function("pureRef","pureRemoteRef","setPureComparing","return ("+compareExpression+")")(pureRef,pureRemoteRef,setPureComparing);
 compare(true);assert.equal(comparing,true);assert.equal(pureRef.current,saved);assert.equal(saved.enabled,true);assert.equal(saved.clarity,73);
 compare(false);assert.equal(comparing,false);pureRemoteRef.current=true;compare(true);assert.equal(comparing,false);
 pureRemoteRef.current=false;pureRef.current={...saved,enabled:false};compare(true);assert.equal(comparing,false);
 console.log("PASS momentary comparison preserves saved tuning, restores on release, and cannot enable processing when unavailable");
}
