import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {withReadTimeout} from '../src/lib/readTimeout.js';
let states=[],refs=[],si=0,ri=0,effects=[],current={id:'member',role:'user',creator_role:'listener'},pending=null,clears=0;
globalThis.window=new EventTarget();globalThis.localStorage={getItem:()=>null,setItem(){}};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const deps={withReadTimeout,
 React:{createElement:(type,props)=>({type,props})},createContext:()=>({Provider:'provider'}),useContext:()=>null,
 useState:initial=>{const i=si++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},
 useRef:initial=>refs[ri++]??(refs[ri-1]={current:initial}),useEffect:fn=>effects.push(fn),
 base44:{auth:{me:async()=>pending?pending:structuredClone(current),logout(){}},functions:{invoke:async()=>({data:{}})}},
 clearPersonalData:async()=>{clears++;},migrateLegacyOffline:async()=>{},setOfflineAccount(){},syncPendingLikes:async()=>{},appParams:{},createAxiosClient:()=>({get:async()=>({})})
};
globalThis.__authRefresh=deps;
const source=fs.readFileSync('src/lib/AuthContext.jsx','utf8').replace(/^import[\s\S]*?;\n/gm,'');
const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.ESNext}}).outputText;
const {AuthProvider}=await import('data:text/javascript;base64,'+Buffer.from('const {'+Object.keys(deps).join(',')+'}=globalThis.__authRefresh;\n'+compiled).toString('base64'));
const render=()=>{si=0;ri=0;effects=[];return AuthProvider({children:null}).props.value;};
let ctx=render();await ctx.checkUserAuth();ctx=render();assert.equal(ctx.user.creator_role,'listener');
let cleanup=effects[1]();
current.creator_role='uploader';window.dispatchEvent(new Event('focus'));await flush();ctx=render();assert.equal(ctx.user.creator_role,'uploader','an admin grant reaches an already open session');
current.creator_role='listener';window.dispatchEvent(new Event('online'));await flush();ctx=render();assert.equal(ctx.user.creator_role,'listener','revocation reaches the open session');
// A slow verification must not restore the signed-out account.
let resolve;pending=new Promise(r=>{resolve=r;});window.dispatchEvent(new Event('focus'));await flush();await ctx.logout(false);resolve({...current,creator_role:'artist'});await flush();ctx=render();assert.equal(ctx.user,null);assert.equal(ctx.isAuthenticated,false);cleanup();pending=null;
// The same stale-response protection applies to explicit auth refreshes.
let finish;pending=new Promise(r=>{finish=r;});const check=ctx.checkUserAuth();await ctx.logout(false);finish(current);await check;ctx=render();assert.equal(ctx.user,null);assert.equal(ctx.isAuthenticated,false);pending=null;
assert.ok(clears>=2);
console.log('PASS open-session creator grant/revocation and stale auth responses after logout');
