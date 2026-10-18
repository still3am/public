import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
globalThis.__React=React;
const source=fs.readFileSync("src/components/QueueLibraryPicker.jsx","utf8");
const tracks=Array.from({length:245},(_,i)=>({id:"track"+i,title:"Song "+i,artist:"Artist"}));
let values=[tracks,false,false,"",new Set()],cursor=0,refCursor=0,refs=[],calls=[],closed=0;
globalThis.__pickerState=initial=>{const index=cursor++;if(!(index in values))values[index]=typeof initial==="function"?initial():initial;return [values[index],next=>values[index]=typeof next==="function"?next(values[index]):next];};
globalThis.__pickerRef=initial=>refs[refCursor++] ||= {current:initial};
globalThis.__pickerPlayer={addToQueue:t=>calls.push(t.id),addManyToQueue:rows=>calls.push(rows.map(t=>t.id))};
const stubs=`
const React=globalThis.__React,useState=globalThis.__pickerState,useRef=globalThis.__pickerRef,useEffect=()=>{},useMemo=fn=>fn(),useCallback=fn=>(globalThis.__pickerLoad=fn,fn);
const useAuth=()=>({user:{id:"listener"}}),useLibrary=()=>({ids:new Set()}),usePlayer=()=>globalThis.__pickerPlayer;
const readAllPages=async()=>{throw Error("network unavailable")};
const base44={entities:{}};
const X=()=>null,Plus=X,Check=X,Loader2=X,Search=X,ListMusic=X,Image=X,IncrementalList=()=>null;
`;
const code=ts.transpileModule(stubs+source.replace(/^import[^;]+;/gm,""),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {default:Picker}=await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
function render(){cursor=0;refCursor=0;return Picker({open:true,onClose:()=>closed++});}
function all(node,predicate){if(!node||typeof node!=="object")return [];return [...(predicate(node)?[node]:[]),...React.Children.toArray(node.props?.children).flatMap(child=>all(child,predicate))];}
let tree=render();
const progressive=all(tree,node=>node.props?.items)[0];assert.equal(progressive.props.items.length,245,"all songs remain available to progressive rendering");
const row=progressive.props.renderItem(tracks[0]);all(row,node=>node.type==="button")[0].props.onClick();
tree=render();const addRemaining=all(tree,node=>node.type==="button"&&React.Children.toArray(node.props.children).includes("Add remaining ("))[0];
assert.ok(addRemaining);addRemaining.props.onClick();
assert.equal(calls[1].length,244,"add remaining includes songs outside the initial rendered batch");assert.ok(!calls[1].includes("track0"),"songs already added are excluded");
tree=render();assert.equal(all(tree,node=>node.type==="button"&&React.Children.toArray(node.props.children).includes("Add remaining ("))[0].props.disabled,true);
tree.props.onKeyDown({key:"Escape",stopPropagation(){}});assert.equal(closed,1,"Escape closes the picker from any control");
values=[null,false,false,"",new Set()];refs=[];render();await globalThis.__pickerLoad();tree=render();
assert.equal(all(tree,node=>node.props?.role==="alert").length,1,"failed initial loading displays an actionable error");
assert.equal(all(tree,node=>node.type==="p"&&node.props.children==="Your library is empty.").length,0,"network errors do not pretend the library is empty");
values[0]=tracks;tree=render();assert.equal(all(tree,node=>node.props?.items)[0].props.items.length,245,"previously loaded music survives a refresh failure");
console.log("PASS full-library queue additions, duplicate prevention, keyboard dismissal, retry state and stale-library recovery");
