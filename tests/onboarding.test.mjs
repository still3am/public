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
assert.deepEqual(model.readOnboardingDraft("a"),{step:6,artists:["Artist"]});
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
const prefs=await load(read("src/lib/userGenres.js").replace(/import[^;]+;/g,"")+"\n");
