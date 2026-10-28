import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('src/context/PlayerContext.jsx','utf8');
const ast=ts.createSourceFile('player.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
function callback(name,environment){
 let expression;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)expression=node.initializer.arguments[0].getText(ast);ts.forEachChild(node,visit);};visit(ast);
 assert.ok(expression,'actual '+name+' callback exists');
 return new Function(...Object.keys(environment),'return ('+expression+');')(...Object.values(environment));
}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(){
 const calls=[],state={},audio={src:'old',pause(){calls.push('pause');},removeAttribute(){this.src='';},load(){calls.push('load');},play(){calls.push('play');return Promise.resolve();}};
 const ref=current=>({current});
 const env={withReadTimeout:read=>read,cancelNotePreviewRef:ref(()=>false),loadTokenRef:ref(0),cancelCrossfade:()=>calls.push('cancel'),queueRef:ref([{id:'song'}]),currentIndexRef:ref(0),
 pendingSeekRef:ref(null),autoPlayOnLoadRef:ref(true),els:()=>[audio],blobUrlRefs:[ref(null)],sideLoadedIdRef:[ref('old')],sideReadyRef:[ref(true)],
 sleepTimerRef:ref(null),clearTimeout:()=>calls.push('clearTimer'),URL:{revokeObjectURL:url=>calls.push('revoke:'+url)},
 setQueue:v=>state.queue=v,setCurrentIndex:v=>state.index=v,setIsPlaying:v=>state.playing=v,setPosition:v=>state.position=v,setDuration:v=>state.duration=v,setDismissed:v=>state.dismissed=v,setSleepTimerEndsAt:v=>state.sleep=v,
 activeIdxRef:ref(0),mirrorPlayback:()=>{},graphNeeded:()=>false,ensureGraph:()=>{},audioCtxRef:ref(null),setGainImmediate:()=>{},configurePlaybackSession:()=>{},
 window:{dispatchEvent:()=>calls.push('error')},CustomEvent:class{},user:null};
 env.stopPlayback=callback('stopPlayback',env);
 return {env,calls,state,audio};
}
{
 const {env,calls,state}=fixture(),pending=deferred();env.resolveUrl=()=>pending.promise;
 const load=callback('loadOnActive',env),clear=callback('clearQueue',env);
 const request=load({id:'song'});clear();pending.resolve('https://test/song');await request;
 assert.equal(calls.includes('play'),false);assert.equal(env.queueRef.current.length,0);assert.equal(state.playing,false);assert.equal(state.dismissed,true);
 console.log('PASS dismissing the player cancels a pending source before playback');
}
{
 const {env,state,audio}=fixture(),first=deferred(),second=deferred();let count=0;
 env.resolveUrl=async track=>track.id;audio.play=()=>++count===1?first.promise:second.promise;
 const load=callback('loadOnActive',env);
 await load({id:'first'});await load({id:'second'});second.resolve();await Promise.resolve();assert.equal(state.playing,true);
 first.reject(Error('old play rejected'));await Promise.resolve();await Promise.resolve();assert.equal(state.playing,true);
 console.log('PASS stale play rejection cannot pause a newer successful song');
}
{
 const {env,calls,state}=fixture(),pending=deferred();let timer;
 env.resolveUrl=()=>pending.promise;env.setTimeout=fn=>{timer=fn;return 10;};
 const load=callback('loadOnActive',env),sleep=callback('setSleepTimer',env);
 const request=load({id:'song'});sleep(5);timer();pending.resolve('https://test/song');await request;
 assert.equal(calls.includes('play'),false);assert.equal(state.playing,false);assert.equal(state.sleep,null);
 console.log('PASS sleep timer cancels pending loads instead of restarting audio');
}
{
 const {env,calls}=fixture();env.blobUrlRefs[0].current='blob:old';env.sleepTimerRef.current=12;
 env.stopPlayback();
 assert.ok(calls.includes('revoke:blob:old'));assert.ok(calls.includes('clearTimer'));
 assert.equal(env.blobUrlRefs[0].current,null);assert.equal(env.sideReadyRef[0].current,false);assert.equal(env.sleepTimerRef.current,null);
 console.log('PASS playback cleanup releases artwork/audio URLs and sleep state');
}
{
 const {env}=fixture(),pending=deferred(),blocked=new Set();
 env.blockedRef={current:blocked};env.offlineAccountRef={current:'owner'};env.getRecord=()=>pending.promise;
 env.navigator={onLine:true};
 const resolve=callback('resolveUrl',env);
 const request=resolve({id:'song',uploader_id:'uploader',audio_url:'https://test/song'},0);
 blocked.add('uploader');pending.resolve(null);
 await assert.rejects(request,/replaced/);assert.equal(env.sideLoadedIdRef[0].current,'old');
 console.log('PASS blocking an uploader cancels a source lookup already in flight');
}
{
 const {env,state}=fixture(),pending=deferred();
 env.autoQueueLoadingRef={current:false};env.offlineAccountRef={current:'owner'};
 env.getUserGenres=async()=>[];env.buildAutoQueue=()=>pending.promise;
 const extend=callback('extendWithGenreRadio',env),request=extend({id:'song'});
 await Promise.resolve();await Promise.resolve();env.stopPlayback();
 pending.resolve([{id:'next'}]);assert.equal(await request,false);assert.deepEqual(state.queue,[]);
 console.log('PASS canceled recommendations cannot rebuild a dismissed queue');
}
{
 const {env,state}=fixture(),pending=deferred();env.offlineAccountRef={current:'owner'};
 env.getOfflineQueue=()=>pending.promise;env.currentTrack={id:'old'};env.countedRef={current:new Set()};env.loadOnActive=()=>{throw Error('Stale offline playback');};
 const advance=callback('advanceOffline',env),request=advance();
 env.stopPlayback();env.offlineAccountRef.current='new-owner';
 pending.resolve([{id:'cached'}]);await request;assert.deepEqual(state.queue,[]);
 console.log('PASS delayed offline advance cannot restart playback after account switching');
}
// Execute the actual offline-artwork hook with controlled async storage reads.
let state,scheduled,cleanup,previousDeps,uid='first-user',pending=new Map(),revoked=[];
const hooks={
 useAuth:()=>({user:{id:uid}}),
 useState:initial=>{state??=typeof initial==='function'?initial():initial;return [state,value=>{state=value;}];},
 useEffect:(fn,deps)=>{if(!previousDeps||deps.some((v,i)=>v!==previousDeps[i])){scheduled=fn;previousDeps=deps;}},
 getRecord:(id,owner)=>{const item=deferred();pending.set(owner+':'+id,item);return item.promise;},
 URL:{createObjectURL:blob=>'blob:'+blob.id,revokeObjectURL:value=>revoked.push(value)}
};
globalThis.__coverLifecycle=hooks;
const hookSource=fs.readFileSync('src/hooks/useOfflineCoverUrl.js','utf8').replace(/^import[^;]+;/gm,'');
const {useOfflineCoverUrl}=await import('data:text/javascript;base64,'+Buffer.from('const {useAuth,useState,useEffect,getRecord,URL}=globalThis.__coverLifecycle;\n'+hookSource).toString('base64'));
const runEffects=()=>{if(scheduled){cleanup?.();const fn=scheduled;scheduled=null;cleanup=fn();}};
assert.equal(useOfflineCoverUrl('one','one.jpg'),'one.jpg');runEffects();
pending.get('first-user:one').resolve({_coverBlob:{id:'one'}});await Promise.resolve();
assert.equal(useOfflineCoverUrl('one','one.jpg'),'blob:one');
assert.equal(useOfflineCoverUrl('two','two.jpg'),'two.jpg','new track never renders old artwork');runEffects();
uid='second-user';
assert.equal(useOfflineCoverUrl('two','second.jpg'),'second.jpg','account switch never renders previous account artwork');runEffects();
pending.get('first-user:two').resolve({_coverBlob:{id:'stale'}});await Promise.resolve();
assert.equal(useOfflineCoverUrl('two','second.jpg'),'second.jpg','late old-account read cannot commit');
pending.get('second-user:two').resolve({_coverBlob:{id:'two'}});await Promise.resolve();
assert.equal(useOfflineCoverUrl('two','second.jpg'),'blob:two');assert.ok(revoked.includes('blob:one'));cleanup();
console.log('PASS offline artwork follows track/account identity and ignores stale storage reads');
{
 const {env,state,audio}=fixture();audio.paused=false;audio.currentTime=73;audio.pause=function(){this.paused=true;};
 Object.assign(env,{activeEl:()=>audio,offlineAccountRef:{current:'account'},blockedRef:{current:new Set()},isPlayingRef:{current:true},notePreviewRef:{current:null},resumeAndPlay:a=>{a.paused=false;state.playing=true;},loadOnActive:()=>{throw Error('must not reload an unchanged source');}});
 env.sideLoadedIdRef[0].current='song';env.cancelNotePreviewRef.current=()=>false;
 const lease=callback('acquireNotePreview',env)(()=>{});
 assert.equal(audio.paused,true);assert.equal(audio.currentTime,73);assert.equal(env.queueRef.current[0].id,'song');
 lease.release();assert.equal(audio.paused,false);assert.equal(audio.currentTime,73);assert.equal(env.currentIndexRef.current,0);
 audio.paused=true;
 callback('acquireNotePreview',env)(()=>{}).release();assert.equal(audio.paused,true,'previously paused music stays paused');
 audio.paused=false;const superseded=callback('acquireNotePreview',env)(()=>{});env.loadTokenRef.current++;superseded.release();assert.equal(audio.paused,true,'obsolete preview cannot resume over new playback');
 console.log('PASS actual player preview lease preserves queue/time, paused state and newer playback intent');
}
{
 const {env,audio}=fixture(),pending=deferred();let requests=0;
 Object.assign(env,{inactiveIdx:()=>0,crossfadingRef:{current:false},preloadingRef:{current:null},preloadVersionRef:{current:0},preloadedTargetRef:{current:0},readyListenerRef:[{current:null}],resolveUrl:()=>{requests++;return pending.promise;}});
 audio.addEventListener=()=>{};audio.removeEventListener=()=>{};audio.readyState=4;
 const preload=callback('preloadSide',env),first=preload(0);await preload(0);await preload(0);
 assert.equal(requests,1,'frequent transition ticks do not restart an in-flight download');
 pending.resolve('buffered');await first;assert.equal(env.sideReadyRef[0].current,true);
 console.log('PASS actual crossfade preloader deduplicates slow requests and reaches ready state');
}

{
 const {env,state,audio}=fixture(),pending=deferred();
 Object.assign(env,{activeEl:()=>audio,syncPositionState:()=>{},crossfadingRef:{current:false},navigator:{userAgent:'Chrome'},playbackErrorMessage:()=> 'Try again'});
 audio.play=()=>pending.promise;
 const resume=callback('resumeAndPlay',env),request=resume(audio);
 env.loadTokenRef.current++;state.playing=false;pending.resolve();await request;
 assert.equal(state.playing,false,'a stale resume cannot mark a newer track playing');
 console.log('PASS delayed resume cannot overwrite a newer playback request');
}
{
 const {env,audio}=fixture();let reloads=0,resumes=0;
 Object.assign(env,{activeEl:()=>audio,currentTrack:{id:'song'},retryRef:{current:new Map([['song',1]])},loadOnActive:()=>reloads++,resumeAndPlay:()=>resumes++});
 audio.paused=true;audio.error={code:4};callback('togglePlay',env)();
 assert.equal(reloads,1);assert.equal(resumes,0);assert.equal(env.retryRef.current.has('song'),false,'explicit retry resets recovery cooldown');
 console.log('PASS pressing Play on a failed source reloads it instead of repeating a failed play');
}

{
 const {env,calls,state,audio}=fixture();env.resolveUrl=async()=> 'https://test/slow';audio.play=()=>new Promise(()=>{});
 env.withReadTimeout=()=>Promise.reject(Object.assign(Error('start timeout'),{code:'READ_TIMEOUT'}));
 await callback('loadOnActive',env)({id:'song'});await Promise.resolve();await Promise.resolve();
 assert.equal(state.playing,false);assert.ok(calls.includes('pause'),'a stalled startup is stopped before a late play can begin');assert.ok(calls.includes('error'),'user receives a recoverable startup error');
 console.log('PASS stalled song startup exits pending playback and provides retry feedback');
}
