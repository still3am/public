import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const load=source=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const read=path=>fs.readFileSync(path,'utf8');
let requests=0,payload;
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{requests++;return {ok:true,json:async()=>({service:'public-track-share',version:1})};};
const urls=await load(read('src/lib/trackShareUrl.js'));
await urls.prepareTrackShare();
assert.match(urls.getTrackShareUrl({id:'song',is_published:true}),/functions\/share-track/);
globalThis.__shareDeps={...urls,shareLink:async value=>{payload=value;return 'copied';}};
const helper=await load('const {shareLink,getTrackShareUrl,getDirectTrackUrl}=globalThis.__shareDeps;\n'+read('src/lib/shareTrack.js').replace(/^import[^;]+;/gm,''));
const track={id:'song',title:'Song',artist:'Artist',is_published:true,approval_status:'approved'};
assert.equal(await helper.sharePublicSongLink(track),'copied');
assert.equal(payload.url,'https://publicmusic.base44.app/track/song');
assert.equal(requests,1,'fallback does not make any backend/health/upload request');
await helper.shareTrack(track);assert.match(payload.url,/functions\/share-track/,'ordinary rich-preview sharing remains unchanged');
assert.throws(()=>helper.sharePublicSongLink({...track,is_published:false}),/Publish/);
assert.throws(()=>helper.sharePublicSongLink({...track,approval_status:'pending'}),/Publish/);
globalThis.fetch=originalFetch;
console.log('PASS direct public-song link works without backend requests even with cached rich-preview availability');
console.log('PASS unpublished and unapproved songs cannot use the public-link fallback');
const source=read('src/components/track/SendTrackModal.jsx');
const ast=ts.createSourceFile('send.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
function actual(name,env){
 let body;const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)body=node.initializer.getText(ast);ts.forEachChild(node,visit);};visit(ast);assert.ok(body);
 return new Function(...Object.keys(env),'return ('+body+');')(...Object.values(env));
}
let sending=false,delivery='',status='',reported=0,notified=false,sharing=false;
const env={picked:{id:'recipient'},user:{id:'sender'},track,note:'Keep this note',sendingRef:{current:false},sharingLinkRef:{current:false},
 setSending:v=>sending=v,setDeliveryError:v=>delivery=v,seed:{current:'sender:song'},alive:{current:true},
 base44:{entities:{Notification:{create:async()=>{throw {response:{status:402}};}}}},
 setSent:()=>notified=true,reportActionError:()=>reported++,
 setSharingLink:v=>sharing=v,setLinkStatus:v=>status=v,sharePublicSongLink:helper.sharePublicSongLink};
await actual('send',env)();
assert.equal(sending,false);assert.match(delivery,/In-app sending is temporarily unavailable/);assert.equal(notified,false);assert.equal(reported,0);assert.equal(env.note,'Keep this note');
await actual('shareSongLink',env)();
assert.match(status,/Link copied/);assert.equal(sharing,false);assert.equal(notified,false);
env.sharePublicSongLink=async()=> 'cancelled';status='old';await actual('shareSongLink',env)();assert.equal(status,'');
console.log('PASS quota failure preserves draft and external sharing never claims in-app success');
console.log('PASS share cancellation never claims a copied or delivered link');
globalThis.__shareReact=React;globalThis.document={body:{}};
const prelude=[
'const React=globalThis.__shareReact,{useState,useRef,useEffect}=React,createPortal=node=>node;',
"const useAuth=()=>({user:{id:'sender'}}),useSafety=()=>({blocked:new Set()}),searchPeople=async()=>({data:{results:[]}}),base44={};",
'const Search=()=>null,X=Search,Send=Search,Check=Search,Loader2=Search,Music=Search,ChevronLeft=Search,Avatar=Search,Image=Search;',
"const reportActionError=()=>{},sharePublicSongLink=async()=> 'copied';"
].join('\n');
const js=ts.transpileModule(prelude+source.replace(/^import[^;]+;/gm,''),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const Component=(await load(js)).default;
const render=value=>renderToStaticMarkup(React.createElement(Component,{track:value,onClose(){}}));
const html=render(track);assert.match(html,/Share song link instead/);assert.match(html,/won’t send a notification inside PUBLIC/);
assert.doesNotMatch(render({...track,is_published:false}),/Share song link instead/);
console.log('PASS actual dialog exposes truthful external sharing only for approved public songs');
