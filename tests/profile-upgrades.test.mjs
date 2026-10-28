import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
import {cropGeometry} from '../src/lib/profileCrop.js';
import {validateMotionFile,validateMotionDuration} from "../src/lib/profileMotion.js";
import {normalizeProfileDraft,reorderTopTracks} from '../src/lib/profileEditing.js';
const source=fs.readFileSync('src/pages/Profile.jsx','utf8'),ast=ts.createSourceFile('profile.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
function fn(name,env={}){let code;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)code=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(code);return new Function(...Object.keys(env),code+';return '+name)(...Object.values(env));}
const formFromProfile=fn('formFromProfile');
assert.deepEqual(reorderTopTracks(['a','b','c'],0,2),['b','c','a']);
assert.deepEqual(reorderTopTracks(['a','b','c'],2,0),['c','a','b']);
assert.deepEqual(reorderTopTracks(['a'],-1,3),['a']);
const base=formFromProfile({display_name:'Listener',top_track_ids:['a','b']});
assert.equal(normalizeProfileDraft({...base,website:'example.com',instagram:'@listener'}).website,'https://example.com/');
assert.equal(normalizeProfileDraft({...base,instagram:'@listener'}).instagram,'listener');
assert.throws(()=>normalizeProfileDraft({...base,website:'javascript:alert(1)'}));
assert.throws(()=>normalizeProfileDraft({...base,top_track_ids:['a','a']}));
assert.throws(()=>normalizeProfileDraft({...base,top_tracks_label:'x'.repeat(41)}));
for(const rotation of [0,90,180,270])for(const x of [-1,0,1])for(const y of [-1,0,1])for(const [iw,ih,w,h]of [[1200,800,768,768],[600,1600,1600,356],[1600,600,900,486]]){
 const g=cropGeometry(iw,ih,w,h,{zoom:1.7,x,y,rotation}),rw=rotation%180?ih:iw,rh=rotation%180?iw:ih;
 assert.ok(g.cx-rw*g.scale/2<=.001&&g.cx+rw*g.scale/2>=w-.001);
 assert.ok(g.cy-rh*g.scale/2<=.001&&g.cy+rh*g.scale/2>=h-.001);
}
function fixture(){
 let profile={id:'me',...base,featured_track_id:'old'},form={...base,featured_track_id:'old'},edit=true,writes=[],errors=[],saving=false;
 const env={formFromProfile,normalizeProfileDraft,isOwn:true,editMode:true,saving:false,uploadingAvatar:false,uploadingBanner:false,me:{id:'me'},targetId:'me',identity:{current:'me:me'},saveLock:{current:false},avatarBusy:{current:false},bannerBusy:{current:false},avatarVersion:{current:0},bannerVersion:{current:0},chosenProfileSong:{current:null},
 setForm:value=>{form=typeof value==='function'?value(form):value;env.form=form;},setProfile:value=>{profile=value;env.profile=profile;},setEditMode:value=>edit=value,setBackgroundDraft(){},setUploadingAvatar(){},setUploadingBanner(){},setSaving:value=>saving=value,
 setSaveError:m=>{if(m)errors.push(m);},actionError:e=>e?.message||'Failed',reportActionError:(e,m)=>errors.push(e?.message||m),window:{dispatchEvent(){}},Event:class{},checkUserAuth:async()=>{},base44:{auth:{updateMe:async patch=>{writes.push(patch);Object.assign(profile,patch);},me:async()=>({...profile})}}};
 env.form=form;env.profile=profile;
 return {env,get form(){return form;},get edit(){return edit;},get writes(){return writes;},get errors(){return errors;},get saving(){return saving;}};
}
{
 const f=fixture();await fn('saveProfileSong',f.env)('new',{id:'new'});assert.equal(f.form.featured_track_id,'new');assert.equal(f.writes.length,0);
 fn('cancelEdit',f.env)();assert.equal(f.form.featured_track_id,'old');assert.equal(f.edit,false);
}
{
 const f=fixture();f.env.setForm({...f.form,featured_track_id:'new',top_tracks_label:'Night drives',banner_mobile_url:'https://test/mobile'});
 await fn('saveProfile',f.env)();assert.equal(f.writes.length,1);assert.equal(f.writes[0].featured_track_id,'new');assert.equal(f.writes[0].top_tracks_label,'Night drives');assert.equal(f.edit,false);
}
{
 const f=fixture();f.env.setForm({...f.form,bio:'Unsaved'});f.env.base44.auth.updateMe=async()=>{throw Error('Network');};
 await fn('saveProfile',f.env)();assert.equal(f.form.bio,'Unsaved');assert.equal(f.edit,true);assert.equal(f.saving,false);assert.equal(f.env.saveLock.current,false);
}
{
 const f=fixture();f.env.setForm({...f.form,bio:'Unsaved'});f.env.base44.auth.updateMe=async()=>{};
 await fn('saveProfile',f.env)();assert.equal(f.edit,true);assert.match(f.errors[0],/not confirmed/);
}
{
 const f=fixture();f.env.avatarBusy.current=true;f.env.setForm({...f.form,bio:'Wait'});await fn('saveProfile',f.env)();assert.equal(f.writes.length,0);
}
{
 const f=fixture();f.env.setProfile({...f.env.profile,banner_url:'https://test/custom.jpg',banner_mobile_url:'https://test/mobile.jpg'});
 f.env.setForm({...formFromProfile(f.env.profile),banner_use_default:true});
 await fn('saveProfile',f.env)();
 assert.deepEqual(f.writes,[{banner_use_default:true}]);assert.equal(f.edit,false);
 assert.equal(formFromProfile(f.env.profile).banner_use_default,true,'default survives reload');
}
{
 const f=fixture();f.env.setForm({...f.form,banner_use_default:true});fn('cancelEdit',f.env)();
 assert.equal(f.form.banner_use_default,false);assert.equal(f.writes.length,0);
}
{
 const f=fixture();const legacy={...f.env.profile,bio:' My saved bio ',website:'example.com',instagram:'https://instagram.com/listener',top_track_ids:['gone','gone']};
 f.env.setProfile(legacy);f.env.setForm({...formFromProfile(legacy),banner_use_default:true});
 await fn('saveProfile',f.env)();assert.deepEqual(f.writes,[{banner_use_default:true}]);assert.equal(f.edit,false);
 assert.equal(f.env.profile.bio,' My saved bio ',"untouched text must not become a hidden gateway edit");
}
{
 const f=fixture();const legacy={...f.env.profile,bio:' My saved bio ',website:'example.com'};
 f.env.setProfile(legacy);f.env.setForm(formFromProfile(legacy));await fn('saveProfile',f.env)();
 assert.equal(f.writes.length,0,"unchanged Save must never request moderation");assert.equal(f.edit,false);
}
{
 const f=fixture();let uploads=0;
 Object.assign(f.env,{validateMotionFile,validateMotionDuration,avatarBusy:{current:false},bannerBusy:{current:false},avatarVersion:{current:0},bannerVersion:{current:0}});
 f.env.base44.integrations={Core:{UploadFile:async({file})=>({file_url:++uploads%2?'https://test/'+file.name:'https://test/poster.jpg'})}};
 const media={file:{name:'clip.mp4',type:'video/mp4',size:100},poster:{name:'poster.jpg'},type:'video',duration:2};
 await fn('uploadProfileMotion',f.env)('avatar',media);
 assert.equal(f.form.avatar_video_url,'https://test/clip.mp4');assert.equal(f.form.avatar_gif_url,'');assert.equal(f.writes.length,0,'upload only changes the draft');
 await fn('saveProfile',f.env)();assert.equal(f.writes[0].avatar_video_url,'https://test/clip.mp4');
}
{
 const f=fixture();Object.assign(f.env,{validateMotionFile,validateMotionDuration,avatarBusy:{current:false},bannerBusy:{current:false},avatarVersion:{current:0},bannerVersion:{current:0}});
 f.env.base44.integrations={Core:{UploadFile:async()=>{throw Error('Upload failed');}}};
 const ok=await fn('uploadProfileMotion',f.env)('banner',{file:{name:'loop.gif',type:'image/gif',size:100},poster:{},type:'gif',duration:1});
 assert.equal(ok,false);assert.equal(f.form.banner_gif_url,'');assert.equal(f.writes.length,0);
}
{
 const f=fixture();f.env.setForm({...f.form,avatar_video_url:'https://test/draft.mp4',banner_gif_url:'https://test/draft.gif'});fn('cancelEdit',f.env)();
 assert.equal(f.form.avatar_video_url,'');assert.equal(f.form.banner_gif_url,'');assert.equal(f.writes.length,0);
}
console.log('PASS crop coverage through all rotations/positions; Top 8 ordering; safe links and limits; song drafts, Cancel, combined saves, ignored writes, failed-save recovery and upload guards');
