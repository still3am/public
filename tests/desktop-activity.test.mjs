import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import {renderToStaticMarkup} from "react-dom/server";
globalThis.__React=React;
globalThis.__query="";globalThis.__params=new URLSearchParams("view=shared");
globalThis.__activity={loading:false,error:false,hasMore:true,unreadCount:2,notifications:[
{id:"share",type:"track_shared",actor_id:"friend",actor:{display_name:"Jo"},track:{id:"song",title:"Night Drive",artist:"Artist"},read:false},
{id:"follow",type:"new_follower",actor_id:"other",actor:{display_name:"Another"},read:false},
{id:"blocked",type:"track_shared",actor_id:"blocked",actor:{display_name:"Hidden"},read:false}
],markAsRead:id=>globalThis.__read=id,reload(){},loadMore(){},markAllAsRead(){}};
const stubs=`
const React=globalThis.__React,useState=()=>[globalThis.__query,value=>globalThis.__query=value];
const useSafety=()=>({blocked:new Set(["blocked"])}),useSearchParams=()=>[globalThis.__params,()=>{}],useNotifications=()=>globalThis.__activity;
const formatDistanceToNow=()=>"Recently";
const Bell=()=>null,Heart=Bell,UserPlus=Bell,Music=Bell,MessageCircle=Bell,CheckCheck=Bell,Send=Bell,Loader2=Bell,Search=Bell,X=Bell,Avatar=Bell,Image=Bell,SafetyControls=Bell;
const Link=({to,children,...props})=>React.createElement("a",{href:to,...props},children);
const EmptyState=({title,description})=>React.createElement("div",null,title,description),LoadError=()=>React.createElement("p",null,"Loading failed");
`;
const code=ts.transpileModule(stubs+fs.readFileSync("src/pages/Notifications.jsx","utf8").replace(/^import[^;]+;/gm,""),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {default:Activity}=await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
const html=()=>renderToStaticMarkup(React.createElement(Activity));
assert.match(html(),/Night Drive/);assert.doesNotMatch(html(),/Another|Hidden/,"shared view excludes other activity and blocked users");assert.match(html(),/Load older notifications/);
globalThis.__query="jo";assert.match(html(),/Night Drive/,"search matches the sender");
globalThis.__query="artist";assert.match(html(),/Night Drive/,"search matches song artists");
globalThis.__query="unknown";assert.match(html(),/No matching activity/);assert.match(html(),/Load older notifications/,"filtering never removes access to older pages");
function all(node,predicate){if(!node||typeof node!=="object")return [];return [...(predicate(node)?[node]:[]),...React.Children.toArray(node.props?.children).flatMap(child=>all(child,predicate))];}
let tree=Activity();all(tree,n=>n.type==="input")[0].props.onKeyDown({key:"Escape"});assert.equal(globalThis.__query,"");
tree=Activity();all(tree,n=>n.props?.to==="/track/song")[0].props.onClick();assert.equal(globalThis.__read,"share","opening a shared song marks its activity read");
globalThis.__activity.error=true;assert.match(html(),/Couldn’t refresh activity/);assert.match(html(),/Night Drive/,"refresh failure keeps loaded activity");
globalThis.__activity.notifications=[];assert.match(html(),/Loading failed/);assert.doesNotMatch(html(),/No notifications yet|No shared songs/,"load failure never claims an empty inbox");
console.log("PASS desktop Activity search, shared filtering, blocked users, pagination, read actions and error recovery");
