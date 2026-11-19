import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as React from 'react';

globalThis.__shelfReact = React;
const source = fs.readFileSync('src/components/ScrollShelf.jsx','utf8').replace(/^import[^;]+;/gm,'');
const mocks = `const React=globalThis.__shelfReact,useRef=value=>({current:value}),useEffect=()=>{},useState=value=>[typeof value==="object"?{...value,overflow:true}:value,()=>{}],ChevronLeft=()=>null,ChevronRight=()=>null;\n`;
const compiled=ts.transpileModule(mocks+source,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {default:ScrollShelf}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
function setup(enabled=true) {
  const tree=ScrollShelf({children:React.createElement('a',{href:'/artist'},'Artist'),dragScroll:enabled});
  const rail=React.Children.toArray(tree.props.children).find(node=>node.props?.role==='region');
  const captured=new Set();
  const element={scrollWidth:1200,clientWidth:400,scrollLeft:200,setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id),scrollBy({left}){this.scrollLeft+=left;}};
  rail.ref.current=element;
  const event=(x=200,y=0,type='mouse')=>({currentTarget:element,target:{closest:()=>null},pointerId:1,pointerType:type,button:0,clientX:x,clientY:y,detail:1,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}});
  return {rail:rail.props,element,event,captured};
}
let {rail,element,event,captured}=setup();
rail.onPointerDown(event());rail.onPointerMove(event(195));assert.equal(element.scrollLeft,200,'small clicks do not scroll');
rail.onPointerUp(event(195));let click=event();rail.onClickCapture(click);assert.equal(click.prevented,false,'normal artist clicks remain available');
rail.onPointerDown(event());rail.onPointerMove(event(100));assert.equal(element.scrollLeft,300,'mouse drag follows pointer distance');assert.equal(captured.has(1),true);
rail.onPointerUp(event(100));assert.equal(captured.size,0);
click=event();rail.onClickCapture(click);assert.equal(click.prevented,true,'releasing a drag cannot open an artist');assert.equal(click.stopped,true);
click=event();click.detail=0;rail.onClickCapture(click);assert.equal(click.prevented,false,'keyboard activation is not swallowed');
({rail,element,event}=setup());rail.onPointerDown(event());rail.onPointerMove(event(198,40));rail.onPointerMove(event(100,40));assert.equal(element.scrollLeft,200,'vertical movement does not hijack page scrolling');
rail.onPointerDown(event(200,0,'touch'));rail.onPointerMove(event(100,0,'touch'));assert.equal(element.scrollLeft,200,'touch keeps native scrolling');
({rail,element,event}=setup(false));rail.onPointerDown(event());rail.onPointerMove(event(100));assert.equal(element.scrollLeft,200,'other shelves retain their existing behavior');
console.log('PASS mouse dragging, click protection, keyboard activation, vertical gestures, native touch and opt-in isolation');
