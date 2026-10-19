import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import postcss from "postcss";
globalThis.__React=React;
const source=p=>fs.readFileSync(p,"utf8");
const load=async(path,stubs)=>{
 const code=ts.transpileModule(stubs+"\n"+source(path).replace(/^import[^;]+;/gm,""),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 return import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
};
let effects=[],events={},navigations=[],focused=0;
globalThis.__effects=effects;globalThis.__nav=path=>navigations.push(path);
globalThis.__pathname="/";
globalThis.window={matchMedia:()=>({matches:true}),history:{state:{idx:0}},addEventListener:(name,fn)=>events[name]=fn,removeEventListener(){}};
globalThis.document={querySelector:()=>({focus(){focused++;}}),querySelectorAll:()=>globalThis.__dialogs||[]};
globalThis.requestAnimationFrame=fn=>fn();
const common=`const React=globalThis.__React;const Link=({children,to,...props})=>React.createElement("a",{href:to,...props},children);const useAuth=()=>({user:globalThis.__user});`;
const header=await load("src/components/DesktopHeader.jsx",common+`
const useLocation=()=>({pathname:globalThis.__pathname}),useNavigate=()=>globalThis.__nav;
const useCallback=fn=>fn,useEffect=fn=>globalThis.__effects.push(fn);
const ChevronLeft=()=>null,Search=ChevronLeft,ArrowUpRight=ChevronLeft;
`);
for(const path of [...source("src/App.jsx").matchAll(/<Route path="([^"]+)"/g)].map(m=>m[1])){
 if(["*","/oauth-consent","/login","/register","/forgot-password","/reset-password"].includes(path))continue;
 const key=path.split("/")[1];assert.ok(header.DESKTOP_PAGES[key],"desktop context covers "+path);
 globalThis.__pathname=path.replace(":id","example").replace(":code","test");
 const html=renderToStaticMarkup(React.createElement(header.default));
 assert.equal(html,"","builder-removed toolbar stays removed; keyboard shortcut remains active");
}
effects.at(-1)();
let prevented=false;events.keydown({metaKey:false,ctrlKey:true,key:"k",preventDefault(){prevented=true;}});
assert.ok(prevented);assert.equal(navigations.at(-1),"/search");assert.equal(focused,1);
globalThis.__dialogs=[{getClientRects:()=>[{}]}];prevented=false;events.keydown({metaKey:true,ctrlKey:false,key:"k",preventDefault(){prevented=true;}});assert.equal(prevented,false,"search shortcut must not navigate behind an open dialog");globalThis.__dialogs=[];
window.matchMedia=()=>({matches:false});prevented=false;events.keydown({metaKey:true,ctrlKey:false,key:"k",preventDefault(){prevented=true;}});assert.equal(prevented,false,"desktop shortcut leaves mobile untouched");
const sidebar=await load("src/components/Sidebar.jsx",common+`
const NavLink=({children,to,className,end,...props})=>React.createElement("a",{href:to,className:typeof className==="function"?className({isActive:to===globalThis.__pathname}):className,...props},children);
const useMyPlaylists=()=>({playlists:[{id:"mine",name:"Late nights"}]}),useSidebarCollapsed=()=>({collapsed:!!globalThis.__collapsed,toggle(){}}),useUnreadCount=()=>3;
const Avatar=()=>null,Logo=()=>null,ThemeToggle=()=>null,publicMonogram="/public-monogram.svg",publicWordmark="/public-wordmark.svg";
const Home=()=>null,GalleryVerticalEnd=Home,Clapperboard=Home,Search=Home,TrendingUp=Home,Clock=Home,LibraryIcon=Home,Disc3=Home,Upload=Home,Bell=Home,ChevronsLeft=Home,ChevronsRight=Home,ListMusic=Home,CloudOff=Home,FolderOpen=Home,BarChart3=Home,Shield=Home,Lightbulb=Home,LifeBuoy=Home,Music2=Home;
`);
globalThis.__user=null;
let html=renderToStaticMarkup(React.createElement(sidebar.default));
assert.match(html,/Help &amp; support/);assert.match(html,/href="\/login"/);assert.doesNotMatch(html,/href="\/admin"|href="\/playlist\/mine"/);
globalThis.__user={id:"u",display_name:"Listener",is_artist:true,role:"admin"};
html=renderToStaticMarkup(React.createElement(sidebar.default));
for(const href of ["/library","/downloads","/artist-dashboard","/admin","/my-uploads","/playlist/mine"])assert.ok(html.includes('href="'+href+'"'));
globalThis.__collapsed=true;assert.match(renderToStaticMarkup(React.createElement(sidebar.default)),/data-collapsed="true"/);
let shelfState={overflow:false,start:true,end:false},moved,scrollListener;
globalThis.__shelf={current:{scrollWidth:1200,clientWidth:400,scrollLeft:0,children:[],addEventListener:(name,fn)=>scrollListener=fn,removeEventListener(){},scrollBy:value=>moved=value,scrollTo:value=>moved=value}};
globalThis.__setShelf=value=>shelfState=typeof value==="function"?value(shelfState):value;
globalThis.__getShelf=()=>shelfState;globalThis.__effects=[];
const shelf=await load("src/components/ScrollShelf.jsx",`
const React=globalThis.__React,useRef=()=>globalThis.__shelf,useState=()=>[globalThis.__getShelf(),globalThis.__setShelf],useEffect=fn=>globalThis.__effects.push(fn),ChevronLeft=()=>null,ChevronRight=ChevronLeft;
`);
shelf.default({children:"Music",label:"Mixes"});globalThis.__effects[0]();
let tree=shelf.default({children:"Music",label:"Mixes"});
assert.equal(tree.props.children[0].props.hidden,false);assert.equal(tree.props.children[0].props.children[0].props.disabled,true);
window.matchMedia=()=>({matches:false});tree.props.children[0].props.children[1].props.onClick();assert.deepEqual(moved,{left:340,behavior:"smooth"});
const region=tree.props.children[1],target={};let handled=false;region.props.onKeyDown({key:"End",target,currentTarget:target,preventDefault(){handled=true;}});assert.ok(handled);assert.deepEqual(moved,{left:800,behavior:"smooth"});
handled=false;region.props.onKeyDown({key:"ArrowRight",target:{},currentTarget:target,preventDefault(){handled=true;}});assert.equal(handled,false,"song button arrow keys are not intercepted");
globalThis.__shelf.current.scrollLeft=800;scrollListener();tree=shelf.default({children:"Music",label:"Mixes"});assert.equal(tree.props.children[0].props.children[1].props.disabled,true);
window.matchMedia=()=>({matches:true});tree.props.children[0].props.children[0].props.onClick();assert.equal(moved.behavior,"auto");
globalThis.__shelf.current.scrollWidth=400;scrollListener();assert.equal(shelf.default({children:"Music"}).props.children[0].props.hidden,true);
const css=postcss.parse(source("src/desktop.css"));
for(const node of css.nodes){if(node.type==="comment")continue;if(node.type==="rule"){assert.ok(node.selector===".desktop-header,.desktop-shelf-controls","only desktop chrome can have unscoped declarations");continue;}assert.equal(node.name,"media");assert.match(node.params,/min-width:768px|min-width:1024px|min-width:1280px|min-width:1440px/);}
console.log("PASS all desktop route contexts, keyboard search, mobile shortcut isolation, role-aware navigation, shelf boundaries/reduced motion, and desktop-only CSS scope");
