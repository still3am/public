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
 const env={loadTokenRef:ref(0),cancelCrossfade:()=>calls.push('cancel'),queueRef:ref([{id:'song'}]),currentIndexRef:ref(0),
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
