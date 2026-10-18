import assert from "node:assert/strict";
import {activeGlobeShare,loadGlobe,saveGlobeShare} from "../src/lib/publicGlobe.js";
let user={id:"me",show_explicit:false},blocked=false,published=true,drop=false,explicit=false;
let profile={id:"p",user_id:"me",visible:true,updated_date:new Date().toISOString()};
const db={auth:{me:async()=>user},entities:{
 PublicProfile:{filter:async()=>[structuredClone(profile)],update:async(_id,data)=>{if(!drop)profile={...profile,...data,updated_date:new Date().toISOString()};}},
 Block:{filter:async()=>blocked?[{user_id:"me",blocked_user_id:"artist"}]:[]},
 Track:{filter:async()=>published?[{id:"song",title:"Song",uploader_id:"artist",explicit,audio_file_uri:"secret",is_published:true,approval_status:"approved"}]:[]}
}};
await saveGlobeShare(db,"DO","song");
assert.ok(activeGlobeShare(profile));
let shares=await loadGlobe(db);assert.equal(shares.length,1);assert.equal(shares[0].country,"DO");assert.equal(shares[0].track.audio_file_uri,undefined);
blocked=true;assert.deepEqual(await loadGlobe(db),[]);await assert.rejects(saveGlobeShare(db,"DO","song"),/unavailable/);blocked=false;
explicit=true;assert.deepEqual(await loadGlobe(db),[]);await assert.rejects(saveGlobeShare(db,"DO","song"),/settings/);explicit=false;
published=false;assert.deepEqual(await loadGlobe(db),[]);await assert.rejects(saveGlobeShare(db,"DO","song"),/published/);published=true;
await assert.rejects(saveGlobeShare(db,"unknown","song"),/country/);
drop=true;await assert.rejects(saveGlobeShare(db,"US","song"),/confirmed/);drop=false;
profile.updated_date=new Date(Date.now()-2*86400000).toISOString();profile.public_globe.expires_at="2099-01-01T00:00:00Z";
assert.equal(activeGlobeShare(profile),false,"expiry cannot outlive database write time plus 24 hours");
await saveGlobeShare(db,"","",true);assert.equal(activeGlobeShare(profile),false);assert.deepEqual(await loadGlobe(db),[]);
console.log("PASS PUBLIC Globe opt-in, country validation, saved-state confirmation, expiry, removal, blocked accounts, explicit preferences and published-song restrictions");
