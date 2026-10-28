import {withReadTimeout} from '../src/lib/readTimeout.js';
globalThis.__preferenceTimeout=withReadTimeout;
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const load=s=>import("data:text/javascript;base64,"+Buffer.from(s).toString("base64"));
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
globalThis.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options?.detail;}};
globalThis.window={addEventListener(){},dispatchEvent(){}};
const model=await load(read("src/lib/onboardingModel.js"));
storage.set(model.draftKey("a"),JSON.stringify({uid:"a",step:999,genres:"bad",artists:[null,"Artist"],colors:["bad"],mode:"fake",shareFavorites:"true"}));
assert.deepEqual(model.readOnboardingDraft("a"),{step:6,artists:["Artist"],editedFields:["artists"]});
assert.equal(model.readOnboardingDraft("b"),null);
assert.equal(model.validHandle("bad name"),false);
assert.equal(model.cleanHandle("@My_Sound"),"my_sound");
const catalog=[{id:"song",artist:"Artist",genre:"Pop",uploader_id:"creator",is_published:true,audio_url:"audio"}];
const people=model.recommendPeople([{user_id:"a"},{user_id:"blocked"},{user_id:"fan",top_track_ids:["song"]},{user_id:"creator"}],catalog,{uid:"a",blocked:new Set(["blocked"]),artists:["Artist"]});
assert.deepEqual(people.map(p=>p.user_id),["fan","creator"]);
assert.equal(people[0].reason,"Shares your favorites");

let uid="a",records={a:{id:"taste-a",user_id:"a",genres:["Pop"],favorite_track_ids:["song"],favorite_artists:["Artist"]},b:{id:"taste-b",user_id:"b",genres:["Jazz"]}},fail=false,ignore=false,writes=0;
globalThis.__b={auth:{me:async()=>({id:uid})},entities:{UserGenre:{
 filter:async q=>records[q.user_id]?[structuredClone(records[q.user_id])]:[],
 update:async(id,data)=>{writes++;if(fail)throw Error("offline");if(!ignore)Object.assign(records[uid],data);return structuredClone(records[uid]);},
 create:async data=>{writes++;return records[uid]={id:"new",...data};}
}}};
const prefs=await load("const withReadTimeout=globalThis.__preferenceTimeout;const base44=globalThis.__b;const GENRES=[\"Pop\",\"Jazz\"];"+read("src/lib/userGenres.js").replace(/import[^;]+;/g,""));

await prefs.saveUserGenres(["Jazz"],"a");
assert.deepEqual(records.a.favorite_track_ids,["song"],"genre save must preserve favorites");
assert.deepEqual(records.a.favorite_artists,["Artist"]);
uid="b";assert.deepEqual(await prefs.getUserGenres("b"),["Jazz"],"cache must follow account");
await assert.rejects(prefs.saveUserGenres(["Pop"],"a"),/Account changed/);
uid="a";fail=true;await assert.rejects(prefs.saveUserGenres(["Pop"],"a"),/offline/);assert.deepEqual(records.a.genres,["Jazz"]);
fail=false;ignore=true;await assert.rejects(prefs.saveUserGenres(["Pop"],"a"),/not confirmed/);ignore=false;
const mixes=await load(read("src/lib/personalMixes.js"));
const ranked=mixes.buildPersonalMixes([...catalog,{id:"other",artist:"Else",genre:"Rock",is_published:true,audio_url:"audio"}],{favoriteTrackIds:["song"],uid:"a",day:1});
assert.equal(ranked[0].tracks[0].id,"song");assert.ok(!ranked.some(m=>m.id==="rotation"||m.id==="essentials"),"taste picks cannot invent plays or library saves");

// Exercise real save/skip/completion handlers with a mocked service, without writing to live users.
const component=read("src/components/NewMemberOnboarding.jsx");
const handlers=component.slice(component.indexOf(" async function owner()"),component.indexOf(" async function upload("));
function flow(step,{sharingChanged=false,shareFavorites=false,failure=false,switched=false,ignored=false,musicReady=true,refreshUnmounts=false,mode="custom",avatar="",name="Listener",avatarFailure=false}={}){
 let draft={step,name,username:"listener",avatar,genres:["Pop"],trackIds:["song"],artists:["Artist"],profileTrack:"",mode,colors:["#000000","#ffffff","#303030"],sharingChanged,shareFavorites};
 const state={error:"",done:false,patches:[],preferences:[],busy:false,navigated:false};const alive={current:true};let account={id:"a",top_track_ids:["existing"],onboarding_completed:false};
 const args={base44:{auth:{me:async()=>switched?{id:"other"}:account,updateMe:async patch=>{if(failure)throw Error("save failed");if(avatarFailure&&Object.hasOwn(patch,"avatar_url"))throw Error("avatar save failed");state.patches.push(patch);if(!ignored)Object.assign(account,patch);return account;}}},user:{id:"a",display_name:"Listener",username:"listener"},draft,step,byId:new Map(catalog.map(t=>[t.id,t])),artistOptions:[{name:"Artist"}],lock:{current:false},followLock:{current:false},alive,setBusy:v=>state.busy=v,setError:v=>state.error=v,setDraft:fn=>{draft=fn(draft);state.step=draft.step;},checkUserAuth:async()=>{if(refreshUnmounts)alive.current=false;},onDone:()=>state.done=true,nav:()=>{state.navigated=true;},saveUserMusicPreferences:async patch=>{if(failure)throw Error("save failed");state.preferences.push(patch);},cleanHandle:model.cleanHandle,validHandle:model.validHandle,errorText:e=>e.message,draftKey:model.draftKey,loading:false,musicReady,loadError:""};
 const api=new Function(...Object.keys(args),handlers+";return {next,complete};")(...Object.values(args));return {api,state};
}
let f=flow(2);await f.api.next();assert.deepEqual(f.state.preferences,[{genres:["Pop"]}]);assert.equal(f.state.step,3);
f=flow(3);await f.api.next(true);assert.equal(f.state.preferences.length,0);assert.equal(f.state.step,4);
f=flow(3,{failure:true});await f.api.next();assert.equal(f.state.step,undefined);assert.equal(f.state.error,"save failed");assert.equal(f.state.busy,false);
f=flow(1,{switched:true});await f.api.next();assert.equal(f.state.patches.length,0);assert.match(f.state.error,/account changed/);
f=flow(6);await f.api.complete();assert.equal(f.state.done,true);assert.deepEqual(f.state.patches,[{onboarding_completed:true}],"unchanged sharing must preserve existing Top 8");
f=flow(6,{sharingChanged:true,shareFavorites:true});await f.api.complete();assert.deepEqual(f.state.patches[0],{top_track_ids:["song"]});assert.equal(f.state.done,true);
f=flow(6,{failure:true});await f.api.complete();assert.equal(f.state.done,false);assert.equal(f.state.error,"save failed");
console.log("PASS onboarding draft validation, account isolation, real taste ranking, privacy preservation, save/skip/failure/completion handlers");

// Late hydration may fill untouched values, but must never undo edits or restored drafts.
let hydrated=model.mergeOnboardingTaste({genres:["Jazz"],artists:[],trackIds:[],editedFields:["genres"]},{genres:["Pop"],favorite_artists:["Artist"],favorite_track_ids:["song"]});
assert.deepEqual(hydrated.genres,["Jazz"]);assert.deepEqual(hydrated.artists,["Artist"]);
hydrated=model.mergeOnboardingTaste({...hydrated,artists:["New artist"],editedFields:["genres","artists"]},{genres:[],favorite_artists:["Old artist"]});
assert.deepEqual(hydrated.artists,["New artist"]);
assert.deepEqual(model.normalizeOnboardingColors(["bad","#123456"]),["#123456","#ffffff","#303030"]);
assert.equal(await model.withOnboardingDeadline(Promise.resolve("ready"),5),"ready");
await assert.rejects(model.withOnboardingDeadline(new Promise(()=>{}),5),/too long/);
storage.set("public:onboarded:a","1");assert.equal(model.onboardingComplete({id:"a",onboarding_completed:false}),true);assert.equal(model.onboardingComplete({id:"b",onboarding_completed:false}),false);storage.delete("public:onboarded:a");
f=flow(6,{sharingChanged:true,shareFavorites:true,musicReady:false});await f.api.complete();assert.equal(f.state.patches.length,0);assert.equal(f.state.done,false);assert.match(f.state.error,/aren’t available/);
f=flow(6,{ignored:true});await f.api.complete();assert.equal(f.state.done,false);assert.match(f.state.error,/not confirmed/);
f=flow(5,{ignored:true});await f.api.next();assert.equal(f.state.step,undefined);assert.match(f.state.error,/not confirmed/);
f=flow(6,{refreshUnmounts:true});await f.api.complete();assert.equal(f.state.navigated,true,"completion must reach Home even if auth refresh hides onboarding");
console.log("PASS slow loading preserves edits, bounded load recovery, stale Settings completion, unavailable favorites protection, ignored saves and completion navigation");

// A catalog/preferences load started before saving cannot replace the freshly saved cache.
prefs.clearUserGenresCache();uid="a";
const originalFilter=globalThis.__b.entities.UserGenre.filter;
let release;
globalThis.__b.entities.UserGenre.filter=()=>new Promise(resolve=>{release=resolve;});
const oldRead=prefs.getUserMusicPreferences("a");
globalThis.__b.entities.UserGenre.filter=originalFilter;
await prefs.saveUserGenres(["Pop"],"a");
release([{id:"taste-a",genres:["Jazz"],favorite_track_ids:[]}]);
assert.deepEqual((await oldRead).genres,["Pop"]);
assert.deepEqual(await prefs.getUserGenres("a"),["Pop"]);
console.log("PASS in-flight preference reads cannot overwrite a newer save");

assert.equal(model.onboardingSearchMatch("Beyoncé", "  BEYONCE  "),true);
assert.equal(model.onboardingSearchMatch("Rauw  Alejandro", "rauw alejandro"),true);
assert.equal(model.onboardingSearchMatch("Artist", "Other"),false);
console.log("PASS onboarding search handles accents, capitalization and extra spaces");

f=flow(5,{mode:"auto"});await f.api.next();assert.equal(f.state.patches[0].profile_background_mode,"auto");assert.equal(f.state.step,6);assert.deepEqual(f.state.patches[0].profile_background_colors,["#000000","#ffffff","#303030"],"switching automatic must retain manual colors");
console.log("PASS automatic mode saves while preserving the manual palette");

const {AVATAR_PRESETS}=await import('../src/lib/avatarPresets.js');
for(const avatar of AVATAR_PRESETS){
 f=flow(1,{avatar:avatar.url,name:'New Listener'});await f.api.next();
 assert.equal(f.state.step,2,'selected avatar advances only after confirmation');
 assert.deepEqual(f.state.patches.at(-1),{avatar_url:avatar.url},'avatar is saved separately so the native preset route runs');
 assert.equal(f.state.patches[0].display_name,'New Listener');
}
f=flow(1,{avatar:AVATAR_PRESETS[0].url,avatarFailure:true});await f.api.next();assert.equal(f.state.step,undefined);assert.equal(f.state.error,'avatar save failed');assert.equal(f.state.busy,false);
f=flow(1,{avatar:AVATAR_PRESETS[0].url});await f.api.next(true);assert.equal(f.state.patches.length,0);assert.equal(f.state.step,2);
f=flow(1,{avatar:AVATAR_PRESETS[0].url,ignored:true});await f.api.next();assert.equal(f.state.step,undefined);
console.log('PASS onboarding avatar and name saves, gallery choices, failures, unconfirmed saves and skip');
