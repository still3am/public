import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Execute the real hook with controlled effects/timers so a slow old request
// can finish after preferences change.
let slots=[],cursor=0,pending=[],timers=[],searches=[];
const changed=(a,b)=>!a||a.length!==b.length||a.some((x,i)=>x!==b[i]);
globalThis.__hooks={
 useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
 useRef(initial){const i=cursor++;return slots[i]??=( {current:initial} );},
 useCallback(fn,deps){const i=cursor++;if(!slots[i]||changed(slots[i].deps,deps))slots[i]={deps,fn};return slots[i].fn;},
 useEffect(fn,deps){const i=cursor++;const old=slots[i];if(!old||changed(old.deps,deps)){old?.cleanup?.();slots[i]={deps};pending.push(()=>{slots[i].cleanup=fn();});}}
};
const events=new EventTarget();
globalThis.window={addEventListener:(...a)=>events.addEventListener(...a),removeEventListener:(...a)=>events.removeEventListener(...a)};
globalThis.__globalSearch=()=>new Promise(resolve=>searches.push(resolve));
let source=readFileSync('src/hooks/useGlobalSearch.js','utf8')
 .replace(/import \{ useCallback, useEffect, useRef, useState \}[^;]*;/,'const {useCallback,useEffect,useRef,useState}=globalThis.__hooks;')
 .replace(/import \{ globalSearch,peekSearch \}[^;]*;/,'const globalSearch=globalThis.__globalSearch,peekSearch=()=>null;')
 .replace(/import \{ useUnpublishedSync \}[^;]*;/,'const useUnpublishedSync=()=>{};');
const {useGlobalSearch}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const realSet=globalThis.setTimeout,realClear=globalThis.clearTimeout;
globalThis.setTimeout=fn=>{const t={fn,active:true};timers.push(t);return t;};
globalThis.clearTimeout=t=>{if(t)t.active=false;};
const render=()=>{cursor=0;const value=useGlobalSearch('song');const jobs=pending;pending=[];jobs.forEach(fn=>fn());return value;};
const flush=()=>{const jobs=timers;timers=[];jobs.filter(t=>t.active).forEach(t=>t.fn());};
const answer=tracks=>({tracks,artists:[],people:[],playlists:[],failed:false,peopleFailed:false});
try{
 render();flush();assert.equal(searches.length,1);
 events.dispatchEvent(new Event('catalog:invalidate'));
 render();flush();assert.equal(searches.length,2);
 searches[1](answer([{id:'explicit-song'}]));await Promise.resolve();await Promise.resolve();
 assert.equal(render().tracks[0].id,'explicit-song');
 searches[0](answer([{id:'old-clean-only'}]));await Promise.resolve();await Promise.resolve();
 assert.equal(render().tracks[0].id,'explicit-song','old response cannot replace updated explicit search');
 events.dispatchEvent(new Event('account:cleared'));assert.equal(render().tracks.length,0,'account change clears prior results immediately');
 console.log('PASS search preference invalidation, fresh request, late old-response rejection and account result clearing');
}finally{globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear;}
