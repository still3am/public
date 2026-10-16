import assert from 'node:assert/strict';
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
const {base44}=await load(source);
await assert.rejects(base44.auth.updateMe({show_explicit:true}),/18 or older/);
assert.equal(updates,0);
await base44.auth.updateMe({show_explicit:true,adult_confirmed:true});
assert.equal(user.show_explicit,true);assert.equal(user.adult_confirmed,true);assert.equal(gatewayCalls,0);
await base44.auth.updateMe({show_explicit:false,adult_confirmed:true});
assert.equal(user.show_explicit,false);assert.equal(user.adult_confirmed,true);
await base44.auth.updateMe({is_artist:true});assert.equal(user.is_artist,true);assert.equal(mirrors[0].is_artist,true);
assert.equal(gatewayCalls,0,'boolean settings must not require backend function availability');
reset();fail=true;await assert.rejects(base44.auth.updateMe({show_explicit:true,adult_confirmed:true}),/unavailable/);assert.equal(user.show_explicit,false);
reset();ignore=true;await assert.rejects(base44.auth.updateMe({show_explicit:true,adult_confirmed:true}),/not confirmed/);
reset();swap=true;await assert.rejects(base44.auth.updateMe({is_artist:true}),/not confirmed/);
reset();user.role='admin';await assert.rejects(base44.auth.updateMe({is_artist:true}),/Administrators/);assert.equal(updates,0);
reset();await assert.rejects(base44.auth.updateMe({show_explicit:'true'}),/Invalid/);
reset();user.disabled=true;await assert.rejects(base44.auth.updateMe({show_explicit:true,adult_confirmed:true}),/unavailable/);assert.equal(updates,0);
reset();await assert.rejects(base44.auth.updateMe({bio:'changed'}),/unavailable/);assert.equal(gatewayCalls,1,'text changes must retain gateway moderation');

// Run the actual Settings handler, without rendering its JSX.
const sheet=read('src/components/profile/SettingsSheet.jsx');
const handler=sheet.slice(sheet.indexOf(' async function preference('),sheet.indexOf(' async function logout('));
let checked=false,busy='',errors=0,confirmed=true,saveFails=false,writes=0;
const fn=new Function('user','lock','logoutLock','window','artist','explicit','setArtist','setExplicit','setSaving','base44','checkUserAuth','reportActionError',handler+';return preference;');
const ui=()=>fn({id:'listener',adult_confirmed:false},{current:false},{current:false},{confirm:()=>confirmed},false,checked,()=>{},value=>{checked=value;},value=>{busy=value;},{auth:{updateMe:async data=>{writes++;assert.equal(checked,false,'switch cannot turn on before confirmation');if(saveFails)throw Error('network');return {id:'listener',...data};}}},async()=>{},()=>{errors++;});
confirmed=false;await ui()('show_explicit',true);assert.equal(writes,0);assert.equal(checked,false);
confirmed=true;saveFails=true;await ui()('show_explicit',true);assert.equal(checked,false);assert.equal(errors,1);assert.equal(busy,'');
saveFails=false;await ui()('show_explicit',true);assert.equal(checked,true);assert.equal(busy,'');

// The mirror permission remains owner-scoped; unrelated roles/fields stay protected.
const schema=JSON.parse(read('base44/entities/User.jsonc'));
assert.equal(schema.properties.show_explicit.rls.write,true);
assert.equal(schema.properties.adult_confirmed.rls.write,true);
assert.deepEqual(schema.properties.is_artist.rls.write,{user_condition:{role:'user'}});
assert.deepEqual(schema.properties.is_blocked.rls.write,{user_condition:{role:'admin'}});
const publicSchema=JSON.parse(read('base44/entities/PublicProfile.jsonc'));
const ownerRule=publicSchema.properties.is_artist.rls.write.$or[1].$and;
assert.ok(ownerRule.some(r=>r['data.user_id']==='{{user.id}}'));
assert.ok(ownerRule.some(r=>r.user_condition?.role==='user'));
console.log('PASS confirmed boolean saves without backend functions, consent, disable, failed/ignored saves, account races, admin/suspension guards, settings UI and owner-only mirror permissions');
