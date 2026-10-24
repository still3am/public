import {BANNER_PRESETS,savePresetBanner} from "../src/lib/bannerPresets.js";
globalThis.BANNER_PRESETS=BANNER_PRESETS;globalThis.savePresetBanner=savePresetBanner;
import assert from 'node:assert/strict';
import {AVATAR_PRESETS} from '../src/lib/avatarPresets.js';
import {savePresetAvatar,withPresetAvatar} from '../src/lib/nativeAvatar.js';
globalThis.__avatarDeps={AVATAR_PRESETS,savePresetAvatar,withPresetAvatar};
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const load=s=>import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
let user,fail=false,ignore=false,swap=false,updates=0,gatewayCalls=0,mirrors=[];
function reset(){user={id:'listener',role:'user',show_explicit:false,adult_confirmed:false,is_artist:false};fail=false;ignore=false;swap=false;updates=0;gatewayCalls=0;mirrors=[];}
reset();
globalThis.window={dispatchEvent(){},addEventListener(){}};
globalThis.__raw={
 auth:{me:async()=>structuredClone(user),updateMe:async data=>{updates++;if(fail)throw Error('unavailable');if(!ignore)Object.assign(user,data);if(swap)user.id='other';return structuredClone(user);}},
 entities:{PublicProfile:{filter:async q=>[{id:'profile',user_id:q.user_id}],update:async(id,data)=>{mirrors.push({id,...data});}}},
 functions:{invoke:async()=>{gatewayCalls++;throw Error('function unavailable');}}
};
let source=read('src/api/base44Client.js').replace(/import \{ createClient \}[^;]*;/,'const createClient=()=>globalThis.__raw;').replace(/import \{ appParams \}[^;]*;/,'const appParams={};');
source=source.replace(/import \{AVATAR_PRESETS\}[^;]*;/,'const {AVATAR_PRESETS}=globalThis.__avatarDeps;').replace(/import \{savePresetAvatar,withPresetAvatar\}[^;]*;/,'const {savePresetAvatar,withPresetAvatar}=globalThis.__avatarDeps;');
source=source.replace(/import recoveredAlbumMetadata[^;]*;/,'const recoveredAlbumMetadata={};').replace(/import \{recoveredAlbumResult,withRecoveredAlbumMetadata\}[^;]*;/,'const recoveredAlbumResult=x=>x,withRecoveredAlbumMetadata=x=>x;');
source=source.replace(/^import[^;]+;/gm,'');
const {base44}=await load(source);
await assert.rejects(base44.auth.updateMe({show_explicit:true}),/18 or older/);
assert.equal(updates,0);
await base44.auth.updateMe({show_explicit:true,adult_confirmed:true});
assert.equal(user.show_explicit,true);assert.equal(user.adult_confirmed,true);assert.equal(gatewayCalls,0);
await base44.auth.updateMe({show_explicit:false,adult_confirmed:true});
assert.equal(user.show_explicit,false);assert.equal(user.adult_confirmed,true);
await assert.rejects(base44.auth.updateMe({is_artist:true}),/administrator approval/);assert.equal(user.is_artist,false);
assert.equal(gatewayCalls,0,'boolean settings must not require backend function availability');
reset();fail=true;await assert.rejects(base44.auth.updateMe({show_explicit:true,adult_confirmed:true}),/unavailable/);assert.equal(user.show_explicit,false);
reset();ignore=true;await assert.rejects(base44.auth.updateMe({show_explicit:true,adult_confirmed:true}),/not confirmed/);
reset();swap=true;await assert.rejects(base44.auth.updateMe({is_artist:true}),/administrator approval/);
reset();user.role='admin';await assert.rejects(base44.auth.updateMe({is_artist:true}),/administrator approval/);assert.equal(updates,0);
reset();await assert.rejects(base44.auth.updateMe({show_explicit:'true'}),/Invalid/);
reset();user.disabled=true;await assert.rejects(base44.auth.updateMe({show_explicit:true,adult_confirmed:true}),/unavailable/);assert.equal(updates,0);
reset();await assert.rejects(base44.auth.updateMe({bio:'changed'}),/unavailable/);assert.equal(gatewayCalls,1,'text changes must retain gateway moderation');

const sheet=read('src/components/profile/SettingsSheet.jsx');assert.ok(!sheet.includes('title="Artist Mode"'));assert.ok(sheet.includes('/artist-registration'));
const schema=JSON.parse(read('base44/entities/User.jsonc')),publicSchema=JSON.parse(read('base44/entities/PublicProfile.jsonc'));
for(const item of [schema,publicSchema]){assert.deepEqual(item.properties.is_artist.rls.write,{user_condition:{role:'admin'}});assert.deepEqual(item.properties.creator_role.rls.write,{user_condition:{role:'admin'}});}
assert.equal(schema.properties.show_explicit.rls.write,true);assert.equal(schema.properties.adult_confirmed.rls.write,true);
console.log('PASS preferences and admin-only creator access; self-serve artist toggle removed');
