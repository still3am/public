import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withReadTimeout} from '../src/lib/readTimeout.js';
const load=s=>import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
globalThis.window={addEventListener(){},removeEventListener(){},dispatchEvent(){}};
let raw='null';globalThis.localStorage={getItem:()=>raw};
const history=await load('const base44={};const entityRows=x=>x;'+fs.readFileSync('src/lib/listeningHistory.js','utf8').replace(/^import[^;]+;/gm,''));
for(const bad of ['null','{}','"broken"','[null,{"session_key":"x"}]','invalid']){raw=bad;assert.deepEqual(history.pendingListening('owner'),[]);}
raw=JSON.stringify([{session_key:'ok',track_id:'song',listened_seconds:12}]);assert.equal(history.pendingListening('owner').length,1);
let state,effect,syncCalled=0;
const recapSource=fs.readFileSync('src/hooks/useRecapHistory.js','utf8').replace(/^import[^;]+;/gm,'');
globalThis.__recapAudit={useEffect:f=>{effect??=f;},useState:v=>[state??=v,v=>{state=v;}],base44:{entities:{ListeningSession:{filter:async()=>[{id:'session'}]},PlayEvent:{filter:async()=>[]}}},readAllPages:read=>read({}),pendingListening:()=>[],syncListeningHistory:()=>{syncCalled++;return new Promise(()=>{});}};
const recap=await load('const {useEffect,useState,base44,readAllPages,pendingListening,syncListeningHistory}=globalThis.__recapAudit;'+recapSource);
recap.useRecapHistory('owner');effect();await new Promise(r=>setImmediate(r));assert.equal(syncCalled,1);assert.equal(state.loading,false,'stalled outbox must not block recap reads');assert.equal(state.sessions[0].id,'session');
globalThis.__prefAudit={withReadTimeout:p=>withReadTimeout(p,5),base44:{entities:{UserGenre:{filter:()=>new Promise(()=>{})}}}};
const pref=await load('const {withReadTimeout,base44}=globalThis.__prefAudit;const GENRES=[];'+fs.readFileSync('src/lib/userGenres.js','utf8').replace(/^import[^;]+;/gm,''));
await assert.rejects(pref.getUserMusicPreferences('owner'),e=>e.code==='READ_TIMEOUT');
console.log('PASS malformed listening cache recovery, nonblocking recap outbox and preference timeout');
