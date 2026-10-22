import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchDiscoveredMusic,getDiscoveredSong,normalizeDeezer} from '../src/lib/musicDiscovery.js';
const actualWindow=globalThis.window,actualDocument=globalThis.document,actualSet=globalThis.setTimeout,actualClear=globalThis.clearTimeout;
const scripts=[],timers=[];
globalThis.window={};
globalThis.document={createElement:()=>({remove(){this.removed=true;}}),head:{appendChild(script){scripts.push(script);}}};
globalThis.setTimeout=(fn,delay)=>{const timer={fn,delay,active:true};timers.push(timer);return timer;};
globalThis.clearTimeout=timer=>{if(timer)timer.active=false;};
const raw=(id,explicit=false)=>({id,title:'Dior',artist:{name:'Pop Smoke'},album:{title:'Meet The Woo',cover_big:'https://cdn-images.dzcdn.net/images/cover/test/500x500.jpg'},link:'https://www.deezer.com/track/'+id,duration:216,explicit_lyrics:explicit,preview:'https://example.com/preview-only.mp3'});
const answer=(script,data)=>{const url=new URL(script.src);assert.ok(['api.deezer.com','itunes.apple.com'].includes(url.hostname));window[url.searchParams.get('callback')](data);};
try{
 const clean={id:'a',show_explicit:false},adult={id:'b',show_explicit:true,adult_confirmed:true};
 assert.deepEqual(await searchDiscoveredMusic('x',adult),[]);assert.equal(scripts.length,0);
 const first=searchDiscoveredMusic('Pop Smoke Dior',clean),second=searchDiscoveredMusic('Pop Smoke Dior',adult);
 assert.equal(scripts.length,1,'same term shares a request without sharing filtered account results');
 answer(scripts[0],{data:[raw(1),raw(2,true)]});
 assert.equal((await first).length,1);assert.equal((await second).length,2);assert.equal(scripts[0].removed,true);
 assert.equal((await searchDiscoveredMusic('Pop Smoke Dior',{show_explicit:true,adult_confirmed:false})).length,1);
 assert.equal(scripts.length,1,'cached public metadata is filtered again for each account');
 const detail=getDiscoveredSong('deezer:2',adult);assert.match(scripts[1].src,/\/track\/2\?/);answer(scripts[1],raw(2,true));assert.equal((await detail).artist,'Pop Smoke');
 await assert.rejects(()=>getDiscoveredSong('deezer:2',clean),/content settings/);
 await assert.rejects(()=>getDiscoveredSong('deezer:..%2fadmin',adult),/Search again/);assert.equal(scripts.length,2);
 const error=searchDiscoveredMusic('unavailable source',adult);scripts[2].onerror();await assert.rejects(error,/connect/);assert.equal(scripts[2].removed,true);
 const timeout=searchDiscoveredMusic('slow source',adult);const timer=timers.find(t=>t.active&&t.delay===10000);timer.fn();await assert.rejects(timeout,/timed out/);
 const cb=new URL(scripts[3].src).searchParams.get('callback');assert.doesNotThrow(()=>window[cb]({data:[raw(5)]}),'late JSONP response is inert');
 const invalid=searchDiscoveredMusic('provider invalid response',adult);answer(scripts[4],{error:{message:'upstream failure'}});await assert.rejects(invalid,/temporarily unavailable/);
 const normalized=normalizeDeezer({...raw(8),link:'javascript:alert(1)',album:{cover_big:'https://cdn-images.dzcdn.net.evil.test/x.jpg'}});assert.equal(normalized.source_url,'');assert.equal(normalized.cover_art_url,'');assert.equal(normalized.audio_available,false);assert.equal(JSON.stringify(normalized).includes('preview-only'),false);
 const discovery=readFileSync('src/components/search/DiscoverMusic.jsx','utf8'),selection=readFileSync('src/components/upload/DiscoverySelection.jsx','utf8');
 assert.equal(discovery.includes('functions.invoke'),false);assert.equal(selection.includes('functions.invoke'),false);
 console.log('PASS direct Deezer JSONP search/details, request sharing, preference isolation, errors, timeout cleanup, stale callbacks, URL restrictions and no Base44 function dependency');
}finally{
 globalThis.window=actualWindow;globalThis.document=actualDocument;globalThis.setTimeout=actualSet;globalThis.clearTimeout=actualClear;
}
