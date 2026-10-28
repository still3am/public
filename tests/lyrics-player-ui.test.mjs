import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as React from 'react';
import {findLyricIndex,prepareLyricTimeline} from '../src/lib/lyricClock.js';
globalThis.__findLyricIndex=findLyricIndex;globalThis.__prepareLyricTimeline=prepareLyricTimeline;
globalThis.__lyricsReact=React;
const source=fs.readFileSync('src/components/SyncedLyrics.jsx','utf8').replace(/^import[^;]+;/gm,'');
const stubs='const prepareLyricTimeline=globalThis.__prepareLyricTimeline,findLyricIndex=globalThis.__findLyricIndex,useLyricClock=({position})=>position,React=globalThis.__lyricsReact,useState=value=>[globalThis.__lyricsBrowsing??value,()=>{}],useMemo=fn=>fn(),LyricInterlude="interlude",useEffect=()=>{},useRef=value=>({current:value}),Loader2="loader";';
const code=ts.transpileModule(stubs+source,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const View=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
const all=(node,predicate)=>!node||typeof node!=='object'?[]:[...(predicate(node)?[node]:[]),...React.Children.toArray(node.props?.children).flatMap(child=>all(child,predicate))];
const contents=node=>!node?'':typeof node==='string'?node:typeof node==='number'?String(node):React.Children.toArray(node.props?.children).map(contents).join(' ');
let retried=0,searched=0,sought=null;
const props={trackId:'new',position:2,onSeek:value=>sought=value,onRetry:()=>retried++,onFindMatch:()=>searched++};
let tree=View({...props,resolvedLyrics:{trackId:'old',text:'STALE LYRICS',record:{lines:[{text:'STALE LYRICS',start_time_ms:1000,end_time_ms:4000}]}}});
assert.equal(tree.props['aria-label'],'Finding lyrics');assert.ok(!contents(tree).includes('STALE'));
tree=View({...props,resolvedLyrics:{trackId:'new',loading:true}});assert.equal(tree.props['aria-label'],'Finding lyrics');
tree=View({...props,resolvedLyrics:{trackId:'new',loading:false,error:'Connection failed'}});
assert.match(contents(tree),/Lyrics couldn’t load/);const actions=all(tree,node=>node.type==='button');actions[0].props.onClick();assert.equal(retried,1);assert.equal(actions.length,1,'only inline retry remains');
tree=View({...props,resolvedLyrics:{trackId:'new',loading:false,instrumental:true}});assert.match(contents(tree),/instrumental/);
tree=View({...props,resolvedLyrics:{trackId:'new',text:'A new line',record:{lines:[{text:'A new line',start_time_ms:1000,end_time_ms:5000}]}}});const line=all(tree,node=>node.props?.className==='public-lyric-line selectable-content')[0];assert.equal(line.props['aria-current'],'true');line.props.onClick();assert.equal(sought,1);
console.log('PASS immediate track isolation, loading/error/instrumental states, retry, alternate search and timed-line seeking');

tree=View({...props,resolvedLyrics:{trackId:'new',record:{lines:[{text:'♪',start_time_ms:1000,end_time_ms:5000}]}}});
assert.ok(all(tree,node=>node.type==='interlude').some(node=>node.props.active===true),'instrumental markers render an active reactive animation');

const introLyrics={trackId:'new',record:{lines:[{text:'First vocal',start_time_ms:12000,end_time_ms:18000},{text:'Next vocal',start_time_ms:18000,end_time_ms:24000}]}};
tree=View({...props,position:2,resolvedLyrics:introLyrics});
assert.ok(all(tree,node=>node.type==='interlude').some(node=>node.props.active===true),'timed intro displays dots before the first vocal');
tree=View({...props,position:13,resolvedLyrics:introLyrics});
const firstVocal=all(tree,node=>node.type==='button'&&contents(node)==='First vocal')[0];
assert.equal(firstVocal.props['aria-current'],'true');firstVocal.props.onClick();assert.equal(sought,12,'intro keeps vocal seeking aligned');

assert.equal(all(tree,node=>node.props?.className==='public-lyrics-follow').length,0,'current-line button is removed');
tree=View({...props,resolvedLyrics:{trackId:'new',text:'Untimed words'}});
assert.ok(contents(tree).includes('no timing available'),'plain lyrics are never presented as synchronized');
assert.equal(all(tree,node=>node.type==='button').length,0,'plain lyrics have no search popup button');

globalThis.__trackLyricsState={identity:JSON.stringify(['old','Old song','Old artist',180]),loading:false,result:{available:true,text:'STALE SONG PAGE WORDS'},error:''};
const pageSource=ts.transpileModule(fs.readFileSync('src/components/TrackCatalogLyrics.jsx','utf8').replace(/^import[^;]+;/gm,''),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const pageStubs='const React=globalThis.__lyricsReact,usePlayer=()=>({}),useEffect=()=>{},useState=value=>[value&&typeof value==="object"?globalThis.__trackLyricsState:value,()=>{}],CollapsibleText="text",FindLyricsModal="modal",findLyricsCatalog=()=>Promise.resolve(null);';
const Page=(await import('data:text/javascript;base64,'+Buffer.from(pageStubs+pageSource).toString('base64'))).default;
const nextTrack={id:'new',title:'New song',artist:'New artist',duration_seconds:180};
let page=Page({track:nextTrack});assert.ok(!contents(page).includes('STALE SONG PAGE WORDS'));assert.ok(contents(page).includes('Finding lyrics'),'song page hides old lyrics before effects run');
globalThis.__trackLyricsState={...globalThis.__trackLyricsState,identity:JSON.stringify(['new','New song','New artist',180]),result:{available:true,text:'Correct song page words'}};
page=Page({track:nextTrack});assert.equal(all(page,node=>node.type==='text')[0].props.text,'Correct song page words');
