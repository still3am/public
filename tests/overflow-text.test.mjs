import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
globalThis.__React=React;
async function compile(path,stub){
 const source=fs.readFileSync(path,"utf8").replace(/^import[^;]+;/gm,"");
 const code=ts.transpileModule(stub+source,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 return (await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"))).default;
}
const find=(node,test)=>!node||typeof node!=="object"?[]:[...(test(node)?[node]:[]),...React.Children.toArray(node.props?.children).flatMap(child=>find(child,test))];
const Artists=await compile("src/components/ArtistLinks.jsx",'const React=globalThis.__React,Link="link",OverflowText="overflow-text";');
let tree=Artists({artist:"Gnarls Barkley,CeeLo Green,Danger Mouse",maxShown:2,linkClassName:"muted"});
const links=find(tree,node=>node.type==="link");
assert.equal(links.length,3,"no artist is hidden behind +N");
assert.equal(links[2].props.children,"Danger Mouse");
assert.equal(links[2].props.to,"/artist?name=Danger%20Mouse");
assert.equal(tree.props.text,"Gnarls Barkley, CeeLo Green, Danger Mouse");
assert.ok(tree.props.className.includes("muted"),"duplicate visual text inherits the credit style");
let state=[],stateIndex=0,refIndex=0,effects=[],resize;
const root={clientWidth:100},content={scrollWidth:250};
globalThis.__hooks={
 useRef:()=>({current:refIndex++===0?root:content}),
 useState:initial=>{const slot=stateIndex++;return [state[slot]??initial,value=>{state[slot]=value;}];},
 useEffect:fn=>{effects.push(fn);}
};
globalThis.ResizeObserver=class{constructor(cb){resize=cb;}observe(){}disconnect(){}};
globalThis.IntersectionObserver=class{constructor(cb){this.cb=cb;}observe(){this.cb([{isIntersecting:true}]);}disconnect(){}};
globalThis.document={fonts:{ready:Promise.resolve()}};
const Overflow=await compile("src/components/OverflowText.jsx",'const React=globalThis.__React,{useRef,useState,useEffect}=globalThis.__hooks;');
function render(){stateIndex=0;refIndex=0;effects=[];return Overflow({text:"Complete long song title",children:React.createElement("link",null,"Complete long song title")});}
tree=render();const cleanup=effects[0]();tree=render();
assert.ok(tree.props.className.includes("has-overflow"));
assert.equal(tree.props.style["--text-travel"],"278px");
const duplicate=find(tree,node=>node.props?.["aria-hidden"]==="true")[0];
assert.equal(duplicate.props.children,"Complete long song title");
assert.equal(find(duplicate,node=>node.type==="link").length,0,"visual copy never duplicates focusable links");
assert.equal(tree.props.style["--text-play"],"running");
content.scrollWidth=80;resize();tree=render();
assert.ok(!tree.props.className.includes("has-overflow"),"short text does not animate");
assert.equal(find(tree,node=>node.props?.["aria-hidden"]==="true").length,0);
cleanup();
console.log("PASS full artist credits, overflow measurement, resize recovery, short-text stability and noninteractive visual copies");
